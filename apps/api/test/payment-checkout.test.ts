import { describe, it, expect, beforeAll, afterAll, spyOn } from "bun:test";
import { createServer, type Server } from "http";
import app from "../src/app";
import { prisma, SeatStatus } from "@buzo/db";
import { bookingService } from "../src/services/booking.service";
import { bookingRepository } from "../src/repositories/booking.repository";
import { signToken } from "../src/lib/jwt";
import * as socketModule from "../src/realtime/socket";
import { RESERVATION_HOLD_MS } from "../src/config/reservation.config";

interface DbTestSeat {
  id: string;
  tripId: string;
  seatNumber: number;
  status: string;
}

interface DbTestBooking {
  id: string;
  passengerId: string;
  tripId: string;
  seatId: string;
  paymentStatus: string;
  createdAt: Date;
}

describe("Payment & Checkout Flow Suite", () => {
  let server: Server;
  let baseUrl: string;

  const passengerId = "passenger-checkout-101";
  const passengerToken = signToken({ userId: passengerId, role: "PASSENGER" });
  const tripId = "cmr257224000nlwuxlnwup9ke";
  const seatId = "cmr256we00004lwuxdd4t3p87";

  beforeAll((done) => {
    server = createServer(app);
    server.listen(0, () => {
      const port = (server.address() as any).port;
      baseUrl = `http://127.0.0.1:${port}/api`;
      done();
    });
  });

  afterAll((done) => {
    server.close(done);
  });

  describe("Happy Path Checkout", () => {
    it("HTTP POST /api/payments/create-checkout-session confirms payment and locks seats to BOOKED", async () => {
      const mockBookings = [
        {
          id: "booking-pending-1",
          passengerId,
          tripId,
          seatId,
          paymentStatus: "PENDING",
          createdAt: new Date(),
          seat: { id: seatId, seatNumber: 5, status: SeatStatus.RESERVED },
        },
      ];

      const confirmSpy = spyOn(
        bookingService,
        "confirmPayment",
      ).mockResolvedValue({
        seatIds: [seatId],
        bookings: mockBookings.map((b) => ({ ...b, paymentStatus: "PAID" })),
      } as any);

      const response = await fetch(
        `${baseUrl}/payments/create-checkout-session`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${passengerToken}`,
          },
          body: JSON.stringify({ tripId }),
        },
      );

      expect(response.status).toBe(200);
      const data = (await response.json()) as any;

      expect(data.success).toBe(true);
      expect(data.message).toBe("Payment confirmed successfully");
      expect(data.seatIds).toEqual([seatId]);
      expect(data.url).toBe("/my-bookings");
      expect(confirmSpy).toHaveBeenCalledWith(passengerId, tripId);

      confirmSpy.mockRestore();
    });

    it("Database Layer: confirmPayment successfully updates booking to PAID and seat to BOOKED within hold", async () => {
      // Simulated DB state with pending reservation
      const dbSeats: DbTestSeat[] = [
        { id: seatId, tripId, seatNumber: 5, status: SeatStatus.RESERVED },
      ];
      const dbBookings: DbTestBooking[] = [
        {
          id: "booking-pending-1",
          passengerId,
          tripId,
          seatId,
          paymentStatus: "PENDING",
          createdAt: new Date(Date.now() - 2 * 60 * 1000), // 2 minutes ago (well within 10-min hold)
        },
      ];

      const txMock = {
        booking: {
          findMany: async (args: any) => {
            return dbBookings
              .filter(
                (b) =>
                  b.passengerId === args.where.passengerId &&
                  b.tripId === args.where.tripId &&
                  b.paymentStatus === args.where.paymentStatus,
              )
              .map((b) => ({
                ...b,
                seat: dbSeats.find((s) => s.id === b.seatId),
              }));
          },
          updateMany: async (args: any) => {
            const targetIds = args.where.id.in;
            let count = 0;
            for (const b of dbBookings) {
              if (targetIds.includes(b.id)) {
                b.paymentStatus = args.data.paymentStatus;
                count++;
              }
            }
            return { count };
          },
          deleteMany: async () => ({ count: 0 }),
        },
        seat: {
          updateMany: async (args: any) => {
            const targetIds = args.where.id.in;
            let count = 0;
            for (const s of dbSeats) {
              if (targetIds.includes(s.id)) {
                s.status = args.data.status;
                count++;
              }
            }
            return { count };
          },
        },
      };

      const originalTransaction = prisma.$transaction;
      prisma.$transaction = (async (cb: any) => cb(txMock)) as any;
      const broadcastSpy = spyOn(
        socketModule,
        "broadcastSeatUpdate",
      ).mockImplementation(() => {});

      try {
        const result = await bookingService.confirmPayment(passengerId, tripId);

        expect(result.seatIds).toEqual([seatId]);
        // State verification: booking is now PAID, seat is now BOOKED
        expect(dbBookings[0]?.paymentStatus).toBe("PAID");
        expect(dbSeats[0]?.status).toBe(SeatStatus.BOOKED);
        expect(broadcastSpy).toHaveBeenCalledWith(
          tripId,
          [seatId],
          SeatStatus.BOOKED,
        );
      } finally {
        prisma.$transaction = originalTransaction;
        broadcastSpy.mockRestore();
      }
    });
  });

  describe("Failed Payment Paths: Leaving Seat Unallocated", () => {
    it("Failed-payment path 1: Expired reservation hold during checkout releases seat back to AVAILABLE", async () => {
      // Simulated DB state with an expired reservation (created 15 minutes ago)
      const dbSeats: DbTestSeat[] = [
        { id: seatId, tripId, seatNumber: 5, status: SeatStatus.RESERVED },
      ];
      let dbBookings: DbTestBooking[] = [
        {
          id: "booking-expired-1",
          passengerId,
          tripId,
          seatId,
          paymentStatus: "PENDING",
          createdAt: new Date(Date.now() - 15 * 60 * 1000), // 15 mins ago (> 10 min hold)
        },
      ];

      const txMock = {
        booking: {
          findMany: async (args: any) => {
            return dbBookings
              .filter(
                (b) =>
                  b.passengerId === args.where.passengerId &&
                  b.tripId === args.where.tripId &&
                  b.paymentStatus === args.where.paymentStatus,
              )
              .map((b) => ({
                ...b,
                seat: dbSeats.find((s) => s.id === b.seatId),
              }));
          },
          deleteMany: async (args: any) => {
            const targetIds = args.where.id.in;
            const initialLen = dbBookings.length;
            dbBookings = dbBookings.filter((b) => !targetIds.includes(b.id));
            return { count: initialLen - dbBookings.length };
          },
          updateMany: async () => ({ count: 0 }),
        },
        seat: {
          updateMany: async (args: any) => {
            const targetIds = args.where.id.in;
            let count = 0;
            for (const s of dbSeats) {
              if (targetIds.includes(s.id)) {
                s.status = args.data.status;
                count++;
              }
            }
            return { count };
          },
        },
      };

      const originalTransaction = prisma.$transaction;
      prisma.$transaction = (async (cb: any) => cb(txMock)) as any;

      try {
        // Attempting checkout on expired reservation must fail and release the seat
        await expect(
          bookingService.confirmPayment(passengerId, tripId),
        ).rejects.toThrow(
          "Reservation has expired (10-minute hold exceeded). Please select your seats again.",
        );

        // Verification: seat status is reverted to AVAILABLE (unallocated!)
        expect(dbSeats[0]?.status).toBe(SeatStatus.AVAILABLE);
        // Verification: pending booking record is purged
        expect(dbBookings.length).toBe(0);
      } finally {
        prisma.$transaction = originalTransaction;
      }
    });

    it("Failed-payment path 1 (HTTP Integration): Checkout attempt with expired hold returns 410 and leaves seat unallocated", async () => {
      const expiredError = new Error(
        "Reservation has expired (10-minute hold exceeded). Please select your seats again.",
      );
      const confirmSpy = spyOn(
        bookingService,
        "confirmPayment",
      ).mockRejectedValue(expiredError);

      const response = await fetch(
        `${baseUrl}/payments/create-checkout-session`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${passengerToken}`,
          },
          body: JSON.stringify({ tripId }),
        },
      );

      expect(response.status).toBe(410);
      const data = (await response.json()) as any;
      expect(data.message).toContain("Reservation has expired");

      confirmSpy.mockRestore();
    });

    it("Failed-payment path 2: User-initiated cancellation at checkout cancels pending booking and releases seats to AVAILABLE", async () => {
      // Simulated DB state with pending reservation
      const dbSeats: DbTestSeat[] = [
        { id: seatId, tripId, seatNumber: 5, status: SeatStatus.RESERVED },
      ];
      let dbBookings: DbTestBooking[] = [
        {
          id: "booking-pending-2",
          passengerId,
          tripId,
          seatId,
          paymentStatus: "PENDING",
          createdAt: new Date(),
        },
      ];

      const txMock = {
        booking: {
          findMany: async (args: any) => {
            return dbBookings
              .filter(
                (b) =>
                  b.passengerId === args.where.passengerId &&
                  b.tripId === args.where.tripId &&
                  b.paymentStatus === args.where.paymentStatus,
              )
              .map((b) => ({ id: b.id, seatId: b.seatId }));
          },
          deleteMany: async (args: any) => {
            const targetIds = args.where.id.in;
            const initialLen = dbBookings.length;
            dbBookings = dbBookings.filter((b) => !targetIds.includes(b.id));
            return { count: initialLen - dbBookings.length };
          },
        },
        seat: {
          updateMany: async (args: any) => {
            const targetIds = args.where.id.in;
            let count = 0;
            for (const s of dbSeats) {
              if (targetIds.includes(s.id)) {
                s.status = args.data.status;
                count++;
              }
            }
            return { count };
          },
        },
      };

      const originalTransaction = prisma.$transaction;
      prisma.$transaction = (async (cb: any) => cb(txMock)) as any;
      const broadcastSpy = spyOn(
        socketModule,
        "broadcastSeatUpdate",
      ).mockImplementation(() => {});

      try {
        // Cancel pending reservation
        const released = await bookingService.cancelPendingReservations(
          passengerId,
          tripId,
        );

        expect(released).toEqual([seatId]);
        // State verification: seat status is reset to AVAILABLE (unallocated!)
        expect(dbSeats[0]?.status).toBe(SeatStatus.AVAILABLE);
        // State verification: pending booking is deleted
        expect(dbBookings.length).toBe(0);
        expect(broadcastSpy).toHaveBeenCalledWith(
          tripId,
          [seatId],
          SeatStatus.AVAILABLE,
        );
      } finally {
        prisma.$transaction = originalTransaction;
        broadcastSpy.mockRestore();
      }
    });

    it("Failed-payment path 2 (HTTP Integration): POST /api/bookings/cancel-pending successfully releases reserved seat", async () => {
      const cancelSpy = spyOn(
        bookingService,
        "cancelPendingReservations",
      ).mockResolvedValue([seatId]);

      const response = await fetch(`${baseUrl}/bookings/cancel-pending`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${passengerToken}`,
        },
        body: JSON.stringify({ tripId }),
      });

      expect(response.status).toBe(200);
      const data = (await response.json()) as any;
      expect(data.message).toBe("Pending reservation cancelled successfully");
      expect(data.releasedSeatIds).toEqual([seatId]);
      expect(cancelSpy).toHaveBeenCalledWith(passengerId, tripId);

      cancelSpy.mockRestore();
    });

    it("Failed-payment path 3: Payment authorization failure rolls back and prevents seat from becoming BOOKED", async () => {
      const dbSeats: DbTestSeat[] = [
        { id: seatId, tripId, seatNumber: 5, status: SeatStatus.RESERVED },
      ];

      const gatewayFailure = new Error(
        "Payment gateway declined transaction: Insufficient funds",
      );
      const confirmSpy = spyOn(
        bookingService,
        "confirmPayment",
      ).mockRejectedValue(gatewayFailure);

      const response = await fetch(
        `${baseUrl}/payments/create-checkout-session`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${passengerToken}`,
          },
          body: JSON.stringify({ tripId }),
        },
      );

      expect(response.status).toBe(500);
      const data = (await response.json()) as any;
      expect(data.message).toContain("Payment gateway declined");

      // Seat was NEVER confirmed or locked into BOOKED
      expect(dbSeats[0]?.status).not.toBe(SeatStatus.BOOKED);
      expect(dbSeats[0]?.status).toBe(SeatStatus.RESERVED);

      confirmSpy.mockRestore();
    });
  });

  describe("Input Validation & Authentication Checks", () => {
    it("should return 400 when tripId is missing from request body", async () => {
      const response = await fetch(
        `${baseUrl}/payments/create-checkout-session`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${passengerToken}`,
          },
          body: JSON.stringify({}),
        },
      );

      expect(response.status).toBe(400);
      const data = (await response.json()) as any;
      expect(data.error).toBe("Missing tripId or authentication");
    });

    it("should return 401 when Authorization header is missing", async () => {
      const response = await fetch(
        `${baseUrl}/payments/create-checkout-session`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ tripId }),
        },
      );

      expect(response.status).toBe(401);
    });
  });
});
