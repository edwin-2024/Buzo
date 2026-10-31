import { describe, it, expect, beforeAll, afterAll, spyOn } from "bun:test";
import { createServer, type Server } from "http";
import app from "../src/app";
import { prisma, SeatStatus } from "@buzo/db";
import { bookingRepository } from "../src/repositories/booking.repository";
import { userRepository } from "../src/repositories/user.repository";
import { tripRepository } from "../src/repositories/trip.repository";
import { seatRepository } from "../src/repositories/seat.repository";
import { signToken } from "../src/lib/jwt";
import * as socketModule from "../src/realtime/socket";

describe("Concurrent Seat Booking & Anti-Double Allocation Suite", () => {
  describe("Database Layer: Atomic Concurrency Guard vs Unguarded Control Case", () => {
    interface DbSeat {
      id: string;
      tripId: string;
      seatNumber: number;
      status: string;
    }

    interface DbBooking {
      id: string;
      passengerId: string;
      tripId: string;
      seatId: string;
      paymentStatus: string;
      createdAt: Date;
    }

    it("Guarded path: two simultaneous bookings for the same seat produce exactly one confirmed booking and no double allocation", async () => {
      // Simulated database tables
      const dbSeats: DbSeat[] = [
        {
          id: "cmr256we00004lwuxdd4t3p87",
          tripId: "cmr257224000nlwuxlnwup9ke",
          seatNumber: 12,
          status: SeatStatus.AVAILABLE,
        },
      ];
      const dbBookings: DbBooking[] = [];
      let bookingIdCounter = 1;

      // Mutex to simulate serialized transactional execution with row-level locks
      let lock = Promise.resolve();
      const withLock = <T>(fn: () => Promise<T>): Promise<T> => {
        const next = lock.then(fn, fn);
        lock = next.then(
          () => {},
          () => {},
        );
        return next;
      };

      const txMock = {
        booking: {
          findMany: async (_args: any) => [],
          create: async (args: any) => {
            const newBooking: DbBooking = {
              id: `booking-${bookingIdCounter++}`,
              passengerId: args.data.passenger.connect.id,
              tripId: args.data.trip.connect.id,
              seatId: args.data.seat.connect.id,
              paymentStatus: args.data.paymentStatus,
              createdAt: new Date(),
            };
            dbBookings.push(newBooking);
            return {
              ...newBooking,
              seat: dbSeats.find((s) => s.id === newBooking.seatId),
              passenger: { id: newBooking.passengerId, name: "Test User" },
              trip: { id: newBooking.tripId },
            };
          },
          deleteMany: async () => ({ count: 0 }),
        },
        seat: {
          updateMany: async (args: any) => {
            // Atomic conditional update matching the repository implementation
            const where = args.where;
            let count = 0;
            for (const seat of dbSeats) {
              const idMatch = where.id?.in
                ? where.id.in.includes(seat.id)
                : seat.id === where.id;
              const statusMatch = where.status
                ? seat.status === where.status
                : true;
              if (idMatch && statusMatch) {
                seat.status = args.data.status;
                count++;
              }
            }
            return { count };
          },
        },
      };

      const originalTransaction = prisma.$transaction;
      prisma.$transaction = (async (callback: any) => {
        return withLock(async () => {
          return callback(txMock);
        });
      }) as any;

      try {
        // Two passengers simultaneously attempt to book the same seat on the same trip
        const bookingAttempt1 = bookingRepository.createBooking(
          {
            passenger: { connect: { id: "passenger-1" } },
            trip: { connect: { id: "cmr257224000nlwuxlnwup9ke" } },
            paymentStatus: "PENDING",
          },
          ["cmr256we00004lwuxdd4t3p87"],
        );

        const bookingAttempt2 = bookingRepository.createBooking(
          {
            passenger: { connect: { id: "passenger-2" } },
            trip: { connect: { id: "cmr257224000nlwuxlnwup9ke" } },
            paymentStatus: "PENDING",
          },
          ["cmr256we00004lwuxdd4t3p87"],
        );

        const results = await Promise.allSettled([
          bookingAttempt1,
          bookingAttempt2,
        ]);

        // Exactly one confirmed booking and one rejection
        const fulfilled = results.filter((r) => r.status === "fulfilled");
        const rejected = results.filter((r) => r.status === "rejected");

        expect(fulfilled.length).toBe(1);
        expect(rejected.length).toBe(1);

        // Rejection reason must be the seat availability conflict
        const failureReason = (rejected[0] as PromiseRejectedResult).reason;
        expect(failureReason.message).toContain(
          "no longer available or currently held by another passenger",
        );

        // Database state verification: NO double allocation
        expect(dbBookings.length).toBe(1);
        expect(dbBookings[0]?.seatId).toBe("cmr256we00004lwuxdd4t3p87");
        const seatInDb = dbSeats.find(
          (s) => s.id === "cmr256we00004lwuxdd4t3p87",
        );
        expect(seatInDb?.status).toBe(SeatStatus.RESERVED);
      } finally {
        prisma.$transaction = originalTransaction;
      }
    });

    it("Control case: without the atomic status guard, simultaneous bookings produce double allocation", async () => {
      // Control case database tables
      const dbSeats: DbSeat[] = [
        {
          id: "cmr256we00004lwuxdd4t3p87",
          tripId: "cmr257224000nlwuxlnwup9ke",
          seatNumber: 12,
          status: SeatStatus.AVAILABLE,
        },
      ];
      const dbBookings: DbBooking[] = [];
      let bookingIdCounter = 1;

      let lock = Promise.resolve();
      const withLock = <T>(fn: () => Promise<T>): Promise<T> => {
        const next = lock.then(fn, fn);
        lock = next.then(
          () => {},
          () => {},
        );
        return next;
      };

      // Flawed / Unguarded transaction: lacks the `status: AVAILABLE` conditional where clause
      // and lacks the `updateResult.count !== seatIds.length` check
      const flawedTx = {
        seat: {
          updateMany: async (args: any) => {
            const where = args.where;
            for (const seat of dbSeats) {
              const idMatch = where.id?.in
                ? where.id.in.includes(seat.id)
                : seat.id === where.id;
              if (idMatch) {
                seat.status = args.data.status;
              }
            }
            return { count: 1 }; // Always returns success without checking previous status
          },
        },
        booking: {
          create: async (args: any) => {
            const newBooking: DbBooking = {
              id: `booking-${bookingIdCounter++}`,
              passengerId: args.data.passenger.connect.id,
              tripId: args.data.trip.connect.id,
              seatId: args.data.seat.connect.id,
              paymentStatus: args.data.paymentStatus,
              createdAt: new Date(),
            };
            dbBookings.push(newBooking);
            return newBooking;
          },
        },
      };

      // Unguarded booking routine simulating what happens without the guard
      const naiveUnguardedBooking = async (
        passengerId: string,
        seatId: string,
      ) => {
        return withLock(async () => {
          // Naive step 1: unconditionally set to RESERVED without checking AVAILABLE status
          await flawedTx.seat.updateMany({
            where: { id: { in: [seatId] } },
            data: { status: SeatStatus.RESERVED },
          });
          // Naive step 2: unconditionally create booking
          return flawedTx.booking.create({
            data: {
              passenger: { connect: { id: passengerId } },
              trip: { connect: { id: "cmr257224000nlwuxlnwup9ke" } },
              seat: { connect: { id: seatId } },
              paymentStatus: "PENDING",
            },
          });
        });
      };

      // Execute two simultaneous bookings through the naive routine
      const [bookingA, bookingB] = await Promise.all([
        naiveUnguardedBooking("passenger-1", "cmr256we00004lwuxdd4t3p87"),
        naiveUnguardedBooking("passenger-2", "cmr256we00004lwuxdd4t3p87"),
      ]);

      // Both succeeded! Double allocation occurs!
      expect(bookingA).toBeDefined();
      expect(bookingB).toBeDefined();
      expect(dbBookings.length).toBe(2);
      expect(dbBookings[0]?.seatId).toBe("cmr256we00004lwuxdd4t3p87");
      expect(dbBookings[1]?.seatId).toBe("cmr256we00004lwuxdd4t3p87");
      expect(dbBookings[0]?.passengerId).not.toBe(dbBookings[1]?.passengerId);

      // This demonstrates that the atomic status guard in createBooking is specifically what
      // prevents double allocation.
    });
  });

  describe("API Layer: Simultaneous HTTP Booking Requests", () => {
    let server: Server;
    let baseUrl: string;

    const tokenPassenger1 = signToken({
      userId: "passenger-alpha",
      role: "PASSENGER",
    });
    const tokenPassenger2 = signToken({
      userId: "passenger-beta",
      role: "PASSENGER",
    });

    const tripId = "cmr257224000nlwuxlnwup9ke";
    const seatId = "cmr256we00004lwuxdd4t3p87";

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

    it("Simultaneous POST /api/bookings for the same seat produces 201 for winner and 409 for loser", async () => {
      let seatReserved = false;

      const mockUser1 = {
        id: "passenger-alpha",
        name: "Alice",
        email: "alice@test.com",
      };
      const mockUser2 = {
        id: "passenger-beta",
        name: "Bob",
        email: "bob@test.com",
      };
      const mockTrip = {
        id: tripId,
        departureTime: new Date("2026-11-20T08:00:00Z"),
      };
      const mockSeat = {
        id: seatId,
        tripId,
        seatNumber: 99,
        status: SeatStatus.AVAILABLE,
      };

      const userSpy = spyOn(userRepository, "findById").mockImplementation(
        async (id: string) => {
          if (id === "passenger-alpha") return mockUser1 as any;
          if (id === "passenger-beta") return mockUser2 as any;
          return null;
        },
      );

      const tripSpy = spyOn(tripRepository, "findById").mockResolvedValue(
        mockTrip as any,
      );
      const seatSpy = spyOn(seatRepository, "findById").mockResolvedValue(
        mockSeat as any,
      );
      const cleanupSpy = spyOn(
        bookingRepository,
        "cleanupExpiredReservations",
      ).mockResolvedValue({
        releasedCount: 0,
        seatIds: [],
        tripIds: [],
        tripSeatMap: [],
      });
      const broadcastSpy = spyOn(
        socketModule,
        "broadcastSeatUpdate",
      ).mockImplementation(() => {});

      // Atomic simulation: the first request through createBooking gets the seat, the second gets a conflict error
      let firstRequestServed = false;
      const createRepoSpy = spyOn(
        bookingRepository,
        "createBooking",
      ).mockImplementation(async (data: any, seatIds: string[]) => {
        if (firstRequestServed) {
          throw new Error(
            "One or more selected seats are no longer available or currently held by another passenger",
          );
        }
        firstRequestServed = true;
        seatReserved = true;
        return [
          {
            id: "booking-winner-1",
            passengerId: data.passenger.connect.id,
            tripId,
            seatId: seatIds[0],
            paymentStatus: "PENDING",
            createdAt: new Date(),
          },
        ] as any;
      });

      // Fire two simultaneous HTTP POST requests for the same seat
      const req1 = fetch(baseUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenPassenger1}`,
        },
        body: JSON.stringify({ tripId, seatIds: [seatId] }),
      });

      const req2 = fetch(baseUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenPassenger2}`,
        },
        body: JSON.stringify({ tripId, seatIds: [seatId] }),
      });

      const [res1, res2] = await Promise.all([req1, req2]);
      const statuses = [res1.status, res2.status];

      // Exactly one HTTP 201 Created and one HTTP 409 Conflict
      expect(statuses).toContain(201);
      expect(statuses).toContain(409);

      const winnerRes = res1.status === 201 ? res1 : res2;
      const loserRes = res1.status === 409 ? res1 : res2;

      const winnerJson = (await winnerRes.json()) as any;
      const loserJson = (await loserRes.json()) as any;

      expect(winnerJson).toBeArray();
      expect(winnerJson[0].seatId).toBe(seatId);
      expect(loserJson.message).toContain(
        "no longer available or currently held by another passenger",
      );
      expect(seatReserved).toBe(true);

      userSpy.mockRestore();
      tripSpy.mockRestore();
      seatSpy.mockRestore();
      cleanupSpy.mockRestore();
      createRepoSpy.mockRestore();
      broadcastSpy.mockRestore();
    });

    it("API Control case: without the availability guard, both simultaneous requests return 201 (double allocation)", async () => {
      const mockUser1 = {
        id: "passenger-alpha",
        name: "Alice",
        email: "alice@test.com",
      };
      const mockUser2 = {
        id: "passenger-beta",
        name: "Bob",
        email: "bob@test.com",
      };
      const mockTrip = {
        id: tripId,
        departureTime: new Date("2026-11-20T08:00:00Z"),
      };
      const mockSeat = {
        id: seatId,
        tripId,
        seatNumber: 88,
        status: SeatStatus.AVAILABLE,
      };

      const userSpy = spyOn(userRepository, "findById").mockImplementation(
        async (id: string) => {
          if (id === "passenger-alpha") return mockUser1 as any;
          if (id === "passenger-beta") return mockUser2 as any;
          return null;
        },
      );
      const tripSpy = spyOn(tripRepository, "findById").mockResolvedValue(
        mockTrip as any,
      );
      const seatSpy = spyOn(seatRepository, "findById").mockResolvedValue(
        mockSeat as any,
      );
      const cleanupSpy = spyOn(
        bookingRepository,
        "cleanupExpiredReservations",
      ).mockResolvedValue({
        releasedCount: 0,
        seatIds: [],
        tripIds: [],
        tripSeatMap: [],
      });
      const broadcastSpy = spyOn(
        socketModule,
        "broadcastSeatUpdate",
      ).mockImplementation(() => {});

      // Flawed controller/service mock: both requests are confirmed without availability check
      let allocationCount = 0;
      const createRepoSpy = spyOn(
        bookingRepository,
        "createBooking",
      ).mockImplementation(async (data: any, seatIds: string[]) => {
        allocationCount++;
        return [
          {
            id: `booking-double-${allocationCount}`,
            passengerId: data.passenger.connect.id,
            tripId,
            seatId: seatIds[0],
            paymentStatus: "PENDING",
            createdAt: new Date(),
          },
        ] as any;
      });

      const req1 = fetch(baseUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenPassenger1}`,
        },
        body: JSON.stringify({ tripId, seatIds: [seatId] }),
      });

      const req2 = fetch(baseUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenPassenger2}`,
        },
        body: JSON.stringify({ tripId, seatIds: [seatId] }),
      });

      const [res1, res2] = await Promise.all([req1, req2]);

      // In the control case, both return 201 Created -> Double allocation!
      expect(res1.status).toBe(201);
      expect(res2.status).toBe(201);
      expect(allocationCount).toBe(2);

      userSpy.mockRestore();
      tripSpy.mockRestore();
      seatSpy.mockRestore();
      cleanupSpy.mockRestore();
      createRepoSpy.mockRestore();
      broadcastSpy.mockRestore();
    });
  });
});
