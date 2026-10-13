import { describe, it, expect, spyOn } from "bun:test";
import { getSeatTier } from "../src/lib/seat-pricing";
import { seatController } from "../src/controllers/seat.controller";
import { seatRepository } from "../src/repositories/seat.repository";

describe("Seat Pricing Tiers (Job: 006-seat-pricing-tiers)", () => {
  describe("getSeatTier unit logic", () => {
    it("should classify front row window seats (1, 4, 5, 8) as PREMIUM_FRONT_WINDOW", () => {
      const frontWindowSeats = [1, 4, 5, 8];
      for (const seatNum of frontWindowSeats) {
        const result = getSeatTier(seatNum);
        expect(result.tier).toBe("PREMIUM_FRONT_WINDOW");
        expect(result.name).toBe("Premium Front Window");
        expect(result.price).toBe(749);
        expect(result.perks).toEqual([
          "Extra legroom",
          "Panoramic front window view",
          "Priority deboarding",
        ]);
      }
    });

    it("should classify front row aisle seats (2, 3, 6, 7) as PREMIUM_FRONT_AISLE", () => {
      const frontAisleSeats = [2, 3, 6, 7];
      for (const seatNum of frontAisleSeats) {
        const result = getSeatTier(seatNum);
        expect(result.tier).toBe("PREMIUM_FRONT_AISLE");
        expect(result.name).toBe("Premium Front Aisle");
        expect(result.price).toBe(699);
        expect(result.perks).toEqual(["Extra legroom", "Quick exit"]);
      }
    });

    it("should classify rows 3+ window seats (9, 12, 13, 16, 21, 40) as STANDARD_WINDOW", () => {
      const standardWindowSeats = [9, 12, 13, 16, 21, 40];
      for (const seatNum of standardWindowSeats) {
        const result = getSeatTier(seatNum);
        expect(result.tier).toBe("STANDARD_WINDOW");
        expect(result.name).toBe("Standard Window");
        expect(result.price).toBe(649);
        expect(result.perks).toEqual(["Window view"]);
      }
    });

    it("should classify rows 3+ aisle seats (10, 11, 14, 15, 22, 39) as STANDARD_AISLE", () => {
      const standardAisleSeats = [10, 11, 14, 15, 22, 39];
      for (const seatNum of standardAisleSeats) {
        const result = getSeatTier(seatNum);
        expect(result.tier).toBe("STANDARD_AISLE");
        expect(result.name).toBe("Standard Aisle");
        expect(result.price).toBe(599);
        expect(result.perks).toEqual(["Standard comfortable seat"]);
      }
    });
  });

  describe("SeatController.getByTrip enrichment", () => {
    it("should enrich repository seats with tier, tierName, price, and perks", async () => {
      const mockSeats = [
        { id: "s-1", tripId: "trip-test-1", seatNumber: 1, status: "AVAILABLE" as const },
        { id: "s-2", tripId: "trip-test-1", seatNumber: 2, status: "AVAILABLE" as const },
        { id: "s-9", tripId: "trip-test-1", seatNumber: 9, status: "AVAILABLE" as const },
        { id: "s-10", tripId: "trip-test-1", seatNumber: 10, status: "BOOKED" as const },
      ];

      const spy = spyOn(seatRepository, "findByTripId").mockResolvedValue(mockSeats as any);

      let responseData: any = null;
      const req: any = { params: { tripId: "trip-test-1" } };
      const res: any = {
        json: (data: any) => {
          responseData = data;
          return res;
        },
      };
      const next = () => {};

      await seatController.getByTrip(req, res, next);

      expect(spy).toHaveBeenCalledWith("trip-test-1");
      expect(responseData).toBeDefined();
      expect(responseData.length).toBe(4);

      // Seat 1: Premium Front Window
      expect(responseData[0]).toEqual({
        id: "s-1",
        tripId: "trip-test-1",
        seatNumber: 1,
        status: "AVAILABLE",
        tier: "PREMIUM_FRONT_WINDOW",
        tierName: "Premium Front Window",
        price: 749,
        perks: [
          "Extra legroom",
          "Panoramic front window view",
          "Priority deboarding",
        ],
      });

      // Seat 2: Premium Front Aisle
      expect(responseData[1]).toEqual({
        id: "s-2",
        tripId: "trip-test-1",
        seatNumber: 2,
        status: "AVAILABLE",
        tier: "PREMIUM_FRONT_AISLE",
        tierName: "Premium Front Aisle",
        price: 699,
        perks: ["Extra legroom", "Quick exit"],
      });

      // Seat 9: Standard Window
      expect(responseData[2]).toEqual({
        id: "s-9",
        tripId: "trip-test-1",
        seatNumber: 9,
        status: "AVAILABLE",
        tier: "STANDARD_WINDOW",
        tierName: "Standard Window",
        price: 649,
        perks: ["Window view"],
      });

      // Seat 10: Standard Aisle
      expect(responseData[3]).toEqual({
        id: "s-10",
        tripId: "trip-test-1",
        seatNumber: 10,
        status: "BOOKED",
        tier: "STANDARD_AISLE",
        tierName: "Standard Aisle",
        price: 599,
        perks: ["Standard comfortable seat"],
      });

      spy.mockRestore();
    });

    it("should support tripId from req.params.id", async () => {
      const mockSeats = [
        { id: "s-5", tripId: "trip-test-2", seatNumber: 5, status: "AVAILABLE" as const },
      ];
      const spy = spyOn(seatRepository, "findByTripId").mockResolvedValue(mockSeats as any);

      let responseData: any = null;
      const req: any = { params: { id: "trip-test-2" } };
      const res: any = {
        json: (data: any) => {
          responseData = data;
          return res;
        },
      };
      const next = () => {};

      await seatController.getByTrip(req, res, next);

      expect(spy).toHaveBeenCalledWith("trip-test-2");
      expect(responseData[0].seatNumber).toBe(5);
      expect(responseData[0].tier).toBe("PREMIUM_FRONT_WINDOW");
      expect(responseData[0].price).toBe(749);

      spy.mockRestore();
    });

    it("should pass errors to next() middleware", async () => {
      const error = new Error("Database error");
      const spy = spyOn(seatRepository, "findByTripId").mockRejectedValue(error);

      let passedError: any = null;
      const req: any = { params: { tripId: "trip-err" } };
      const res: any = { json: () => res };
      const next = (err: any) => {
        passedError = err;
      };

      await seatController.getByTrip(req, res, next);

      expect(passedError).toBe(error);

      spy.mockRestore();
    });
  });
});
