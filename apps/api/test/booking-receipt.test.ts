import { describe, it, expect, beforeAll, afterAll, spyOn } from "bun:test";
import { createServer, type Server } from "http";
import app from "../src/app";
import { receiptService } from "../src/services/receipt.service";
import { bookingService } from "../src/services/booking.service";
import { bookingController } from "../src/controllers/booking.controller";
import { signToken } from "../src/lib/jwt";
import { getSeatTier } from "../src/lib/seat-pricing";

describe("Automated PDF Booking Receipt & Email Export (Job: 007-booking-receipt-pdf)", () => {
  const mockBooking = {
    id: "booking-uuid-12345678",
    passengerId: "passenger-1",
    seatId: "seat-1",
    paymentStatus: "PAID" as const,
    createdAt: new Date("2026-10-14T10:00:00Z"),
    passenger: {
      id: "passenger-1",
      name: "Jane Doe",
      email: "jane.doe@example.com",
      role: "PASSENGER" as const,
    },
    seat: {
      id: "seat-1",
      seatNumber: 1,
      status: "BOOKED" as const,
    },
    trip: {
      id: "trip-1",
      departureTime: new Date("2026-10-15T08:00:00Z"),
      arrivalTime: new Date("2026-10-15T14:00:00Z"),
      status: "SCHEDULED" as const,
      route: {
        name: "Delhi - Jaipur Express",
      },
      bus: {
        number: "DL-01-AB-1234",
        capacity: 40,
      },
    },
  };

  const mockStandardBooking = {
    ...mockBooking,
    id: "booking-standard-87654321",
    seat: {
      id: "seat-10",
      seatNumber: 10,
      status: "BOOKED" as const,
    },
  };

  describe("ReceiptService Unit Tests", () => {
    it("should generate a valid %PDF-1.4 binary buffer", () => {
      const buffer = receiptService.generateReceiptPdf(mockBooking);

      expect(Buffer.isBuffer(buffer)).toBe(true);
      expect(buffer.length).toBeGreaterThan(500);

      const pdfString = buffer.toString("utf-8");

      // Verify header and trailer compliance
      expect(pdfString.startsWith("%PDF-1.4\n")).toBe(true);
      expect(pdfString.endsWith("%%EOF\n")).toBe(true);
      expect(pdfString).toContain("xref");
      expect(pdfString).toContain("trailer");
      expect(pdfString).toContain("startxref");
    });

    it("should include passenger, journey, bus, seat tier, and payment info in the PDF content stream", () => {
      const buffer = receiptService.generateReceiptPdf(mockBooking);
      const pdfString = buffer.toString("utf-8");

      // Branding & Reference
      expect(pdfString).toContain("BUZO INTERCITY TRANSIT");
      expect(pdfString).toContain("TAX INVOICE & TRAVEL RECEIPT");
      expect(pdfString).toContain("INV-12345678");

      // Passenger details
      expect(pdfString).toContain("Jane Doe");
      expect(pdfString).toContain("jane.doe@example.com");
      expect(pdfString).toContain("booking-uuid-12345678");

      // Journey details
      expect(pdfString).toContain("Delhi - Jaipur Express");
      expect(pdfString).toContain("DL-01-AB-1234");

      // Seat Tier details from getSeatTier(1) -> Premium Front Window
      const expectedTier = getSeatTier(1);
      expect(pdfString).toContain("Seat 1");
      expect(pdfString).toContain(expectedTier.name);
      expect(pdfString).toContain(`INR ${expectedTier.price}.00`);

      // Payment Confirmation
      expect(pdfString).toContain("STATUS: PAID");

      // Support & Terms
      expect(pdfString).toContain("1800-BUZO-BUS");
      expect(pdfString).toContain("support@buzo.com");
    });

    it("should dynamically resolve standard tier pricing for row 3+ aisle seat", () => {
      const buffer = receiptService.generateReceiptPdf(mockStandardBooking);
      const pdfString = buffer.toString("utf-8");

      const expectedTier = getSeatTier(10);
      expect(expectedTier.name).toBe("Standard Aisle");
      expect(expectedTier.price).toBe(599);

      expect(pdfString).toContain("Seat 10");
      expect(pdfString).toContain("Standard Aisle");
      expect(pdfString).toContain("INR 599.00");
    });

    it("should simulate receipt email dispatch and return structured result", async () => {
      const result = await receiptService.sendReceiptEmail(mockBooking);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.message).toBe("Receipt sent to passenger email");
      expect(result.recipient).toBe("jane.doe@example.com");
      expect(result.bookingId).toBe("booking-uuid-12345678");
    });
  });

  describe("BookingController Unit Handlers", () => {
    it("getReceipt: should return 404 when booking is not found", async () => {
      const spy = spyOn(bookingService, "findById").mockRejectedValue(
        new Error("Booking not found")
      );

      let statusCode = 0;
      let responseBody: any = null;

      const req: any = {
        params: { id: "not-found" },
        user: { userId: "passenger-1", role: "PASSENGER" },
      };
      const res: any = {
        status: (code: number) => {
          statusCode = code;
          return res;
        },
        json: (data: any) => {
          responseBody = data;
          return res;
        },
      };
      const next = () => {};

      await bookingController.getReceipt(req, res, next);

      expect(statusCode).toBe(404);
      expect(responseBody).toEqual({ message: "Booking not found" });

      spy.mockRestore();
    });

    it("getReceipt: should return 403 when passenger tries to access another passenger's receipt", async () => {
      const spy = spyOn(bookingService, "findById").mockResolvedValue(mockBooking as any);

      let statusCode = 0;
      let responseBody: any = null;

      const req: any = {
        params: { id: mockBooking.id },
        user: { userId: "different-passenger", role: "PASSENGER" },
      };
      const res: any = {
        status: (code: number) => {
          statusCode = code;
          return res;
        },
        json: (data: any) => {
          responseBody = data;
          return res;
        },
      };
      const next = () => {};

      await bookingController.getReceipt(req, res, next);

      expect(statusCode).toBe(403);
      expect(responseBody.message).toContain("Forbidden");

      spy.mockRestore();
    });

    it("getReceipt: should stream PDF buffer with headers for booking owner", async () => {
      const spy = spyOn(bookingService, "findById").mockResolvedValue(mockBooking as any);

      let statusCode = 0;
      const headers: Record<string, string | number> = {};
      let sentBody: any = null;

      const req: any = {
        params: { id: mockBooking.id },
        user: { userId: "passenger-1", role: "PASSENGER" },
      };
      const res: any = {
        status: (code: number) => {
          statusCode = code;
          return res;
        },
        setHeader: (name: string, val: string | number) => {
          headers[name] = val;
          return res;
        },
        send: (body: any) => {
          sentBody = body;
          return res;
        },
      };
      const next = () => {};

      await bookingController.getReceipt(req, res, next);

      expect(statusCode).toBe(200);
      expect(headers["Content-Type"]).toBe("application/pdf");
      expect(headers["Content-Disposition"]).toBe(
        `attachment; filename="buzo-receipt-${mockBooking.id}.pdf"`
      );
      expect(Buffer.isBuffer(sentBody)).toBe(true);
      expect(sentBody.toString("utf-8").startsWith("%PDF-1.4\n")).toBe(true);

      spy.mockRestore();
    });

    it("emailReceipt: should return 403 when passenger is not owner", async () => {
      const spy = spyOn(bookingService, "findById").mockResolvedValue(mockBooking as any);

      let statusCode = 0;
      let responseBody: any = null;

      const req: any = {
        params: { id: mockBooking.id },
        user: { userId: "different-passenger", role: "PASSENGER" },
      };
      const res: any = {
        status: (code: number) => {
          statusCode = code;
          return res;
        },
        json: (data: any) => {
          responseBody = data;
          return res;
        },
      };
      const next = () => {};

      await bookingController.emailReceipt(req, res, next);

      expect(statusCode).toBe(403);
      expect(responseBody.message).toContain("Forbidden");

      spy.mockRestore();
    });

    it("emailReceipt: should dispatch email and return 200 for owner", async () => {
      const spy = spyOn(bookingService, "findById").mockResolvedValue(mockBooking as any);

      let statusCode = 0;
      let responseBody: any = null;

      const req: any = {
        params: { id: mockBooking.id },
        user: { userId: "passenger-1", role: "PASSENGER" },
      };
      const res: any = {
        status: (code: number) => {
          statusCode = code;
          return res;
        },
        json: (data: any) => {
          responseBody = data;
          return res;
        },
      };
      const next = () => {};

      await bookingController.emailReceipt(req, res, next);

      expect(statusCode).toBe(200);
      expect(responseBody.success).toBe(true);
      expect(responseBody.recipient).toBe("jane.doe@example.com");
      expect(responseBody.bookingId).toBe(mockBooking.id);

      spy.mockRestore();
    });
  });

  describe("HTTP Integration Routes (GET/POST /api/bookings/:id/receipt*)", () => {
    let server: Server;
    let baseUrl: string;

    const passengerToken = signToken({ userId: "passenger-1", role: "PASSENGER" });
    const wrongPassengerToken = signToken({ userId: "passenger-wrong", role: "PASSENGER" });
    const adminToken = signToken({ userId: "admin-master", role: "ADMIN" });

    beforeAll((done) => {
      server = createServer(app);
      server.listen(0, () => {
        const port = (server.address() as any).port;
        baseUrl = `http://127.0.0.1:${port}/api/bookings`;
        done();
      });
    });

    afterAll((done) => {
      server.close(done);
    });

    it("GET /:id/receipt should return 401 when unauthenticated", async () => {
      const response = await fetch(`${baseUrl}/${mockBooking.id}/receipt`);
      expect(response.status).toBe(401);
    });

    it("GET /:id/receipt should return 403 for unauthorized passenger", async () => {
      const spy = spyOn(bookingService, "findById").mockResolvedValue(mockBooking as any);

      const response = await fetch(`${baseUrl}/${mockBooking.id}/receipt`, {
        headers: { Authorization: `Bearer ${wrongPassengerToken}` },
      });

      expect(response.status).toBe(403);
      const data = (await response.json()) as any;
      expect(data.message).toContain("Forbidden");

      spy.mockRestore();
    });

    it("GET /:id/receipt should return 200 and binary PDF for authorized owner", async () => {
      const spy = spyOn(bookingService, "findById").mockResolvedValue(mockBooking as any);

      const response = await fetch(`${baseUrl}/${mockBooking.id}/receipt`, {
        headers: { Authorization: `Bearer ${passengerToken}` },
      });

      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toBe("application/pdf");
      expect(response.headers.get("content-disposition")).toBe(
        `attachment; filename="buzo-receipt-${mockBooking.id}.pdf"`
      );

      const arrayBuf = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuf);
      const pdfText = buffer.toString("utf-8");

      expect(pdfText.startsWith("%PDF-1.4\n")).toBe(true);
      expect(pdfText.endsWith("%%EOF\n")).toBe(true);
      expect(pdfText).toContain("Jane Doe");
      expect(pdfText).toContain("Delhi - Jaipur Express");

      spy.mockRestore();
    });

    it("GET /:id/receipt should return 200 and binary PDF for admin user", async () => {
      const spy = spyOn(bookingService, "findById").mockResolvedValue(mockBooking as any);

      const response = await fetch(`${baseUrl}/${mockBooking.id}/receipt`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toBe("application/pdf");

      const arrayBuf = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuf);
      expect(buffer.toString("utf-8").startsWith("%PDF-1.4\n")).toBe(true);

      spy.mockRestore();
    });

    it("GET /:id/receipt should return 404 when booking does not exist", async () => {
      const spy = spyOn(bookingService, "findById").mockRejectedValue(
        new Error("Booking not found")
      );

      const response = await fetch(`${baseUrl}/non-existent/receipt`, {
        headers: { Authorization: `Bearer ${passengerToken}` },
      });

      expect(response.status).toBe(404);
      const data = (await response.json()) as any;
      expect(data.message).toBe("Booking not found");

      spy.mockRestore();
    });

    it("POST /:id/receipt/email should return 401 when unauthenticated", async () => {
      const response = await fetch(`${baseUrl}/${mockBooking.id}/receipt/email`, {
        method: "POST",
      });
      expect(response.status).toBe(401);
    });

    it("POST /:id/receipt/email should return 403 for unauthorized passenger", async () => {
      const spy = spyOn(bookingService, "findById").mockResolvedValue(mockBooking as any);

      const response = await fetch(`${baseUrl}/${mockBooking.id}/receipt/email`, {
        method: "POST",
        headers: { Authorization: `Bearer ${wrongPassengerToken}` },
      });

      expect(response.status).toBe(403);
      const data = (await response.json()) as any;
      expect(data.message).toContain("Forbidden");

      spy.mockRestore();
    });

    it("POST /:id/receipt/email should return 200 for authorized owner", async () => {
      const spy = spyOn(bookingService, "findById").mockResolvedValue(mockBooking as any);

      const response = await fetch(`${baseUrl}/${mockBooking.id}/receipt/email`, {
        method: "POST",
        headers: { Authorization: `Bearer ${passengerToken}` },
      });

      expect(response.status).toBe(200);
      const data = (await response.json()) as any;
      expect(data.success).toBe(true);
      expect(data.recipient).toBe("jane.doe@example.com");
      expect(data.bookingId).toBe(mockBooking.id);

      spy.mockRestore();
    });

    it("POST /:id/receipt/email should return 200 for admin", async () => {
      const spy = spyOn(bookingService, "findById").mockResolvedValue(mockBooking as any);

      const response = await fetch(`${baseUrl}/${mockBooking.id}/receipt/email`, {
        method: "POST",
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      expect(response.status).toBe(200);
      const data = (await response.json()) as any;
      expect(data.success).toBe(true);
      expect(data.recipient).toBe("jane.doe@example.com");

      spy.mockRestore();
    });
  });
});
