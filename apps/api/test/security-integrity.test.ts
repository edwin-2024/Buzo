import { describe, it, expect, spyOn, beforeEach, afterEach } from "bun:test";
import { ZodError, z } from "zod";
import { createBookingSchema } from "../src/validation/booking.schema";
import { errorHandler } from "../src/middleware/error.middleware";
import { BookingController } from "../src/controllers/booking.controller";
import { bookingService } from "../src/services/booking.service";
import { BusLocationController } from "../src/controllers/bus-location.controller";
import { busLocationService } from "../src/services/bus-location.service";
import { driverRepository } from "../src/repositories/driver.repository";
import { tokenRevocationService } from "../src/services/token-revocation.service";
import { authMiddleware } from "../src/middleware/auth.middleware";
import { requireRole } from "../src/middleware/role.middleware";
import { signToken } from "../src/lib/jwt";
import app from "../src/app";

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

    describe("BusLocationController Fleet GPS Anti-Spoofing Controls", () => {
        const busLocationController = new BusLocationController();

        it("requireRole: should reject PASSENGER with 403 when attempting driver GPS telemetry update", () => {
            const middleware = requireRole("DRIVER", "ADMIN");
            let statusSent = 0;
            let jsonSent: any = null;
            const req: any = { user: { userId: "passenger-1", role: "PASSENGER" } };
            const res: any = {
                status: (code: number) => {
                    statusSent = code;
                    return { json: (d: any) => { jsonSent = d; } };
                },
            };
            let nextCalled = false;

            middleware(req, res, () => { nextCalled = true; });

            expect(statusSent).toBe(403);
            expect(jsonSent.message).toContain("Insufficient permissions");
            expect(nextCalled).toBe(false);
        });

        it("update: should reject DRIVER with 403 if assigned to a different bus", async () => {
            const driverSpy = spyOn(driverRepository, "findByUserId").mockResolvedValue({
                id: "driver-rec-1",
                userId: "driver-user-1",
                assignedBusId: "bus-assigned-999",
            } as any);

            let statusSent = 0;
            let jsonSent: any = null;
            const req: any = {
                params: { busId: "bus-victim-101" },
                user: { userId: "driver-user-1", role: "DRIVER" },
                body: {
                    latitude: 12.9716,
                    longitude: 77.5946,
                    heading: 90,
                    speed: 45,
                },
            };
            const res: any = {
                status: (code: number) => {
                    statusSent = code;
                    return { json: (d: any) => { jsonSent = d; } };
                },
            };

            await busLocationController.update(req, res, (() => {}) as any);

            expect(statusSent).toBe(403);
            expect(jsonSent.message).toContain("Forbidden: You are not authorized to update telemetry for this bus");

            driverSpy.mockRestore();
        });

        it("update: should allow DRIVER assigned to the target bus", async () => {
            const driverSpy = spyOn(driverRepository, "findByUserId").mockResolvedValue({
                id: "driver-rec-1",
                userId: "driver-user-1",
                assignedBusId: "bus-assigned-999",
            } as any);

            const serviceSpy = spyOn(busLocationService, "updateLocation").mockResolvedValue({
                busId: "bus-assigned-999",
                latitude: 12.9716,
                longitude: 77.5946,
                heading: 90,
                speed: 45,
                updatedAt: new Date(),
            } as any);

            let jsonSent: any = null;
            const req: any = {
                params: { busId: "bus-assigned-999" },
                user: { userId: "driver-user-1", role: "DRIVER" },
                body: {
                    latitude: 12.9716,
                    longitude: 77.5946,
                    heading: 90,
                    speed: 45,
                },
            };
            const res: any = {
                json: (d: any) => { jsonSent = d; },
            };

            await busLocationController.update(req, res, (() => {}) as any);

            expect(jsonSent).toBeDefined();
            expect(jsonSent.busId).toBe("bus-assigned-999");

            driverSpy.mockRestore();
            serviceSpy.mockRestore();
        });

        it("update: should allow ADMIN to broadcast telemetry for any bus", async () => {
            const serviceSpy = spyOn(busLocationService, "updateLocation").mockResolvedValue({
                busId: "bus-any-123",
                latitude: 13.0827,
                longitude: 80.2707,
                heading: 180,
                speed: 55,
                updatedAt: new Date(),
            } as any);

            let jsonSent: any = null;
            const req: any = {
                params: { busId: "bus-any-123" },
                user: { userId: "admin-super", role: "ADMIN" },
                body: {
                    latitude: 13.0827,
                    longitude: 80.2707,
                    heading: 180,
                    speed: 55,
                },
            };
            const res: any = {
                json: (d: any) => { jsonSent = d; },
            };

            await busLocationController.update(req, res, (() => {}) as any);

            expect(jsonSent).toBeDefined();
            expect(jsonSent.busId).toBe("bus-any-123");

            serviceSpy.mockRestore();
        });
    });

    describe("Token Revocation & Logout Security Lifecycle", () => {
        beforeEach(() => {
            tokenRevocationService.clearForTesting();
        });

        it("should accept valid unrevoked token in authMiddleware", async () => {
            const token = signToken({ userId: "u123", role: "PASSENGER" });
            const req: any = {
                headers: { authorization: `Bearer ${token}` },
            };
            const res: any = {
                status: (c: number) => ({ json: (d: any) => ({ code: c, body: d }) }),
            };
            let nextCalled = false;

            await authMiddleware(req, res, () => { nextCalled = true; });

            expect(nextCalled).toBe(true);
            expect(req.user.userId).toBe("u123");
            expect(req.user.role).toBe("PASSENGER");
        });

        it("should reject revoked token with 401 after explicit logout revocation", async () => {
            const token = signToken({ userId: "u123", role: "PASSENGER" });

            // Revoke the token
            tokenRevocationService.revokeToken(token);

            let statusSent = 0;
            let jsonSent: any = null;
            const req: any = {
                headers: { authorization: `Bearer ${token}` },
            };
            const res: any = {
                status: (code: number) => {
                    statusSent = code;
                    return { json: (d: any) => { jsonSent = d; } };
                },
            };
            let nextCalled = false;

            await authMiddleware(req, res, () => { nextCalled = true; });

            expect(nextCalled).toBe(false);
            expect(statusSent).toBe(401);
            expect(jsonSent.message).toContain("revoked or invalidated");
        });

        it("should reject token when all user tokens have been revoked (e.g. role demotion/security reset)", async () => {
            const token = signToken({ userId: "compromised-user", role: "DRIVER" });

            // Invalidate all tokens for this user
            tokenRevocationService.revokeAllUserTokens("compromised-user");

            let statusSent = 0;
            let jsonSent: any = null;
            const req: any = {
                headers: { authorization: `Bearer ${token}` },
            };
            const res: any = {
                status: (code: number) => {
                    statusSent = code;
                    return { json: (d: any) => { jsonSent = d; } };
                },
            };
            let nextCalled = false;

            await authMiddleware(req, res, () => { nextCalled = true; });

            expect(nextCalled).toBe(false);
            expect(statusSent).toBe(401);
            expect(jsonSent.message).toContain("revoked or invalidated");
        });
    });

    describe("HTTP Security Headers & Health Probe", () => {
        let server: any;
        let baseUrl: string;

        beforeEach(async () => {
            await new Promise<void>((resolve) => {
                server = app.listen(0, () => {
                    const port = (server.address() as any).port;
                    baseUrl = `http://127.0.0.1:${port}`;
                    resolve();
                });
            });
        });

        afterEach(async () => {
            if (server) {
                await new Promise<void>((resolve) => server.close(() => resolve()));
            }
        });

        it("GET /health should return 200 with uptime and status ok", async () => {
            const response = await fetch(`${baseUrl}/health`);
            expect(response.status).toBe(200);
            const data: any = await response.json();
            expect(data.status).toBe("ok");
            expect(typeof data.uptime).toBe("number");
        });

        it("should include standard Helmet security headers on responses", async () => {
            const response = await fetch(`${baseUrl}/health`);
            const headers = response.headers;

            // Helmet security headers
            expect(headers.get("x-content-type-options")).toBe("nosniff");
            expect(headers.get("x-frame-options")).toBe("SAMEORIGIN");
            expect(headers.get("x-dns-prefetch-control")).toBe("off");
            expect(headers.get("cross-origin-resource-policy")).toBe("cross-origin");
        });
    });
});
