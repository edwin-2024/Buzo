import { describe, it, expect, spyOn } from "bun:test";
import { errorHandler } from "../src/middleware/error.middleware";
import { bookingService } from "../src/services/booking.service";
import { bookingRepository } from "../src/repositories/booking.repository";
import { userRepository } from "../src/repositories/user.repository";
import { tripRepository } from "../src/repositories/trip.repository";
import { seatRepository } from "../src/repositories/seat.repository";
import * as socketModule from "../src/realtime/socket";
import { RESERVATION_HOLD_MS, RESERVATION_HOLD_MINUTES } from "../src/config/reservation.config";

const SeatStatus = {
    AVAILABLE: "AVAILABLE" as const,
    RESERVED: "RESERVED" as const,
    BOOKED: "BOOKED" as const,
};

describe("Reservation Hold, Expiry & Concurrency Suite", () => {
    describe("Reservation Configuration", () => {
        it("should enforce a 10-minute hold window (600,000 ms)", () => {
            expect(RESERVATION_HOLD_MINUTES).toBe(10);
            expect(RESERVATION_HOLD_MS).toBe(10 * 60 * 1000);
        });
    });

    describe("Error Middleware HTTP Status Mapping", () => {
        it("should map 'already reserved or no longer available' to HTTP 409 Conflict", () => {
            const err = new Error("One or more selected seats are already reserved or no longer available.");
            let statusCode = 0;
            let responseJson: any = null;

            const res: any = {
                status: (code: number) => {
                    statusCode = code;
                    return {
                        json: (data: any) => {
                            responseJson = data;
                        },
                    };
                },
            };

            errorHandler(err, {} as any, res, (() => {}) as any);
            expect(statusCode).toBe(409);
            expect(responseJson.message).toContain("already reserved or no longer available");
        });

        it("should map 'Reservation hold has expired' to HTTP 410 Gone", () => {
            const err = new Error("Reservation hold has expired. Please re-select your seats.");
            let statusCode = 0;
            let responseJson: any = null;

            const res: any = {
                status: (code: number) => {
                    statusCode = code;
                    return {
                        json: (data: any) => {
                            responseJson = data;
                        },
                    };
                },
            };

            errorHandler(err, {} as any, res, (() => {}) as any);
            expect(statusCode).toBe(410);
            expect(responseJson.message).toContain("Reservation hold has expired");
        });
    });

    describe("Booking Service - Concurrency & Race Condition Guard", () => {
        it("should successfully reserve when seats are available and broadcast RESERVED status", async () => {
            const mockUser = { id: "passenger-1", name: "Alice", email: "alice@example.com" };
            const mockTrip = { id: "trip-1", routeId: "route-1" };
            const mockSeat = { id: "seat-1", tripId: "trip-1", seatNumber: 1, status: SeatStatus.AVAILABLE };
            const mockBookings = [
                {
                    id: "booking-101",
                    passengerId: "passenger-1",
                    seatId: "seat-1",
                    tripId: "trip-1",
                    paymentStatus: "PENDING" as const,
                    createdAt: new Date(),
                    seat: { id: "seat-1", seatNumber: 1, status: SeatStatus.RESERVED },
                },
            ];

            const cleanupSpy = spyOn(bookingRepository, "cleanupExpiredReservations").mockResolvedValue({
                releasedCount: 0,
                seatIds: [],
                tripIds: [],
            });
            const userSpy = spyOn(userRepository, "findById").mockResolvedValue(mockUser as any);
            const tripSpy = spyOn(tripRepository, "findById").mockResolvedValue(mockTrip as any);
            const seatSpy = spyOn(seatRepository, "findById").mockResolvedValue(mockSeat as any);
            const createRepoSpy = spyOn(bookingRepository, "createBooking").mockResolvedValue(mockBookings as any);
            const broadcastSpy = spyOn(socketModule, "broadcastSeatUpdate").mockImplementation(() => {});

            const result = await bookingService.create("passenger-1", {
                tripId: "trip-1",
                seatIds: ["seat-1"],
            });

            expect(result).toHaveLength(1);
            expect(result[0]?.paymentStatus).toBe("PENDING");
            expect(broadcastSpy).toHaveBeenCalledWith("trip-1", ["seat-1"], SeatStatus.RESERVED);

            cleanupSpy.mockRestore();
            userSpy.mockRestore();
            tripSpy.mockRestore();
            seatSpy.mockRestore();
            createRepoSpy.mockRestore();
            broadcastSpy.mockRestore();
        });

        it("should reject concurrent reservation if another transaction locked/claimed the seat first", async () => {
            const mockUser = { id: "passenger-2", name: "Bob", email: "bob@example.com" };
            const mockTrip = { id: "trip-1", routeId: "route-1" };
            const mockSeat = { id: "seat-1", tripId: "trip-1", seatNumber: 1, status: SeatStatus.AVAILABLE };
            const conflictError = new Error("One or more selected seats are no longer available or currently held by another passenger");

            const cleanupSpy = spyOn(bookingRepository, "cleanupExpiredReservations").mockResolvedValue({
                releasedCount: 0,
                seatIds: [],
                tripIds: [],
            });
            const userSpy = spyOn(userRepository, "findById").mockResolvedValue(mockUser as any);
            const tripSpy = spyOn(tripRepository, "findById").mockResolvedValue(mockTrip as any);
            const seatSpy = spyOn(seatRepository, "findById").mockResolvedValue(mockSeat as any);
            const createRepoSpy = spyOn(bookingRepository, "createBooking").mockRejectedValue(conflictError);

            await expect(
                bookingService.create("passenger-2", {
                    tripId: "trip-1",
                    seatIds: ["seat-1"],
                })
            ).rejects.toThrow("no longer available or currently held by another passenger");

            cleanupSpy.mockRestore();
            userSpy.mockRestore();
            tripSpy.mockRestore();
            seatSpy.mockRestore();
            createRepoSpy.mockRestore();
        });
    });

    describe("Booking Service - Payment Confirmation within Hold vs Expired", () => {
        it("should confirm payment and broadcast BOOKED status when completed within 10-minute hold", async () => {
            const mockResult = {
                seatIds: ["seat-1"],
                bookings: [
                    {
                        id: "booking-101",
                        passengerId: "passenger-1",
                        seatId: "seat-1",
                        tripId: "trip-1",
                        paymentStatus: "PAID",
                        createdAt: new Date(Date.now() - 3 * 60 * 1000), // 3 minutes ago
                    },
                ],
            };

            const confirmSpy = spyOn(bookingRepository, "confirmPayment").mockResolvedValue(mockResult as any);
            const broadcastSpy = spyOn(socketModule, "broadcastSeatUpdate").mockImplementation(() => {});

            const result = await bookingService.confirmPayment("passenger-1", "trip-1");

            expect(result.seatIds).toEqual(["seat-1"]);
            expect(broadcastSpy).toHaveBeenCalledWith("trip-1", ["seat-1"], SeatStatus.BOOKED);

            confirmSpy.mockRestore();
            broadcastSpy.mockRestore();
        });

        it("should reject payment confirmation when hold has expired beyond 10 minutes", async () => {
            const expiredError = new Error("Reservation has expired (10-minute hold exceeded). Please select your seats again.");
            const confirmSpy = spyOn(bookingRepository, "confirmPayment").mockRejectedValue(expiredError);

            await expect(
                bookingService.confirmPayment("passenger-1", "trip-1")
            ).rejects.toThrow("Reservation has expired");

            confirmSpy.mockRestore();
        });
    });

    describe("Booking Service - Cancellation and Active Sweeper", () => {
        it("cancelPendingReservations should release seats back to AVAILABLE and broadcast update", async () => {
            const cancelSpy = spyOn(bookingRepository, "cancelPendingReservations").mockResolvedValue(["seat-1", "seat-2"]);
            const broadcastSpy = spyOn(socketModule, "broadcastSeatUpdate").mockImplementation(() => {});

            const result = await bookingService.cancelPendingReservations("passenger-1", "trip-1");

            expect(result).toEqual(["seat-1", "seat-2"]);
            expect(broadcastSpy).toHaveBeenCalledWith("trip-1", ["seat-1", "seat-2"], SeatStatus.AVAILABLE);

            cancelSpy.mockRestore();
            broadcastSpy.mockRestore();
        });

        it("cleanupExpiredReservations should sweep stale holds across trips and broadcast updates", async () => {
            const cleanupSpy = spyOn(bookingRepository, "cleanupExpiredReservations").mockResolvedValue({
                releasedCount: 1,
                seatIds: ["seat-5"],
                tripIds: ["trip-1"],
            });
            const broadcastSpy = spyOn(socketModule, "broadcastSeatUpdate").mockImplementation(() => {});

            const result = await bookingService.cleanupExpiredReservations();

            expect(result.releasedCount).toBe(1);
            expect(broadcastSpy).toHaveBeenCalledWith("trip-1", ["seat-5"], SeatStatus.AVAILABLE);

            cleanupSpy.mockRestore();
            broadcastSpy.mockRestore();
        });
    });

    describe("Client-side Hold Expiry Math Verification", () => {
        it("should evaluate hold as active within 10 minutes", () => {
            const createdAt = new Date(Date.now() - 4 * 60 * 1000); // 4 minutes ago
            const ageMs = Date.now() - createdAt.getTime();
            const isHoldExpired = ageMs > RESERVATION_HOLD_MS;
            const remainingMinutes = Math.max(1, Math.ceil((RESERVATION_HOLD_MS - ageMs) / 60000));

            expect(isHoldExpired).toBe(false);
            expect(remainingMinutes).toBe(6);
        });

        it("should evaluate hold as expired past 10 minutes", () => {
            const createdAt = new Date(Date.now() - 11 * 60 * 1000); // 11 minutes ago
            const ageMs = Date.now() - createdAt.getTime();
            const isHoldExpired = ageMs > RESERVATION_HOLD_MS;

            expect(isHoldExpired).toBe(true);
        });
    });
});
