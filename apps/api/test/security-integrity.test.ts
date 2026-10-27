import { describe, it, expect } from "bun:test";
import { ZodError, z } from "zod";
import { createBookingSchema } from "../src/validation/booking.schema";
import { errorHandler } from "../src/middleware/error.middleware";
import { BookingController } from "../src/controllers/booking.controller";
import { bookingService } from "../src/services/booking.service";

describe("Security & Validation Integrity Suite", () => {
    describe("createBookingSchema (Seat Deduplication)", () => {
        it("should accept unique valid cuid seat IDs", () => {
            const valid = {
                tripId: "cmr257224000nlwuxlnwup9ke",
                seatIds: [
                    "cmr256we00004lwuxdd4t3p87",
                    "cmr256we00005lwuxdd4t3p88",
                ],
            };
            const result = createBookingSchema.safeParse(valid);
            expect(result.success).toBe(true);
        });

        it("should reject duplicate seat IDs in reservation request", () => {
            const duplicates = {
                tripId: "cmr257224000nlwuxlnwup9ke",
                seatIds: [
                    "cmr256we00004lwuxdd4t3p87",
                    "cmr256we00004lwuxdd4t3p87",
                ],
            };
            const result = createBookingSchema.safeParse(duplicates);
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error.issues[0]?.message).toContain("Duplicate seat IDs are not allowed");
            }
        });
    });

    describe("Centralized errorHandler Middleware", () => {
        it("should format ZodError as 400 with structured validation issues", () => {
            const testSchema = z.object({ name: z.string().min(3) });
            let thrownError: any;
            try {
                testSchema.parse({ name: "a" });
            } catch (err) {
                thrownError = err;
            }

            let statusSent = 0;
            let jsonSent: any = null;
            const res: any = {
                status: (code: number) => {
                    statusSent = code;
                    return {
                        json: (data: any) => {
                            jsonSent = data;
                        },
                    };
                },
            };

            errorHandler(thrownError, {} as any, res, (() => {}) as any);
            expect(statusSent).toBe(400);
            expect(jsonSent.message).toBe("Validation failed");
            expect(jsonSent.errors[0].path).toBe("name");
        });

        it("should format Prisma P2002 unique constraint violations as 409", () => {
            const prismaError = {
                code: "P2002",
                meta: { target: ["tripId", "seatNumber"] },
            };

            let statusSent = 0;
            let jsonSent: any = null;
            const res: any = {
                status: (code: number) => {
                    statusSent = code;
                    return {
                        json: (data: any) => {
                            jsonSent = data;
                        },
                    };
                },
            };

            errorHandler(prismaError, {} as any, res, (() => {}) as any);
            expect(statusSent).toBe(409);
            expect(jsonSent.message).toContain("unique constraint violation");
            expect(jsonSent.fields).toEqual(["tripId", "seatNumber"]);
        });
    });

    describe("BookingController Authorization Controls", () => {
        const controller = new BookingController();

        it("getById: should return 403 when user is neither owner nor admin", async () => {
            const originalFindById = bookingService.findById;
            bookingService.findById = async () => ({
                id: "b1",
                passengerId: "passenger-owner-123",
            } as any);

            let statusSent = 0;
            let jsonSent: any = null;
            const req: any = {
                params: { id: "b1" },
                user: { userId: "stranger-456", role: "PASSENGER" },
            };
            const res: any = {
                status: (code: number) => {
                    statusSent = code;
                    return {
                        json: (data: any) => {
                            jsonSent = data;
                        },
                    };
                },
            };

            await controller.getById(req, res, (() => {}) as any);
            expect(statusSent).toBe(403);
            expect(jsonSent.message).toContain("Forbidden");

            bookingService.findById = originalFindById;
        });

        it("delete: should return 403 when user is neither owner nor admin", async () => {
            const originalFindById = bookingService.findById;
            bookingService.findById = async () => ({
                id: "b1",
                passengerId: "passenger-owner-123",
            } as any);

            let statusSent = 0;
            let jsonSent: any = null;
            const req: any = {
                params: { id: "b1" },
                user: { userId: "stranger-456", role: "PASSENGER" },
            };
            const res: any = {
                status: (code: number) => {
                    statusSent = code;
                    return {
                        json: (data: any) => {
                            jsonSent = data;
                        },
                    };
                },
            };

            await controller.delete(req, res, (() => {}) as any);
            expect(statusSent).toBe(403);
            expect(jsonSent.message).toContain("Forbidden");

            bookingService.findById = originalFindById;
        });
    });
});
