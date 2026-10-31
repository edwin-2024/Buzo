import { describe, it, expect, spyOn, beforeEach, afterEach } from "bun:test";
import { tripRepository } from "../src/repositories/trip.repository";
import { tripService } from "../src/services/trip.service";
import { stopRepository } from "../src/repositories/stop.repository";
import { busRepository } from "../src/repositories/bus.repository";
import { busLocationRepository } from "../src/repositories/bus-location.repository";
import { busLocationService } from "../src/services/bus-location.service";
import { tripController } from "../src/controllers/trip.controller";
import * as socketModule from "../src/realtime/socket";

describe("Performance & Scaling Optimization Suite", () => {
    describe("TripRepository.buildSearchWhere (Database-level Pushdown)", () => {
        it("should construct Prisma where clause with case-insensitive stop filters and date window", () => {
            const where = tripRepository.buildSearchWhere("Bangalore", "Goa", "2026-11-15");

            expect(where).toBeDefined();

            // Check date filter boundary
            expect(where.departureTime).toBeDefined();
            expect(where.departureTime?.gte).toEqual(new Date("2026-11-15T00:00:00.000Z"));
            expect(where.departureTime?.lte).toEqual(new Date("2026-11-15T23:59:59.999Z"));

            // Check stop relation pushdown
            expect(where.AND).toBeDefined();
            const andConditions = where.AND as any[];
            expect(andConditions.length).toBe(2);

            const originStopCheck = andConditions[0].route.stops.some.stop.name;
            expect(originStopCheck.contains).toBe("Bangalore");
            expect(originStopCheck.mode).toBe("insensitive");

            const destStopCheck = andConditions[1].route.stops.some.stop.name;
            expect(destStopCheck.contains).toBe("Goa");
            expect(destStopCheck.mode).toBe("insensitive");
        });

        it("should build search where clause without date filter when date is not provided", () => {
            const where = tripRepository.buildSearchWhere("Mumbai", "Pune");

            expect(where.departureTime).toBeUndefined();
            const andConditions = where.AND as any[];
            expect(andConditions.length).toBe(2);
        });
    });

    describe("TripService.searchTrips (Sequence Ordering & Typo Fallback)", () => {
        const mockTripForward = {
            id: "trip-fwd-1",
            departureTime: new Date("2026-11-15T10:00:00.000Z"),
            route: {
                stops: [
                    { order: 1, stop: { name: "Bangalore Majestic" } },
                    { order: 2, stop: { name: "Hosur Central" } },
                    { order: 3, stop: { name: "Salem Bus Stand" } },
                ],
            },
        };

        const mockTripReverse = {
            id: "trip-rev-2",
            departureTime: new Date("2026-11-15T10:00:00.000Z"),
            route: {
                stops: [
                    { order: 1, stop: { name: "Salem Bus Stand" } },
                    { order: 2, stop: { name: "Hosur Central" } },
                    { order: 3, stop: { name: "Bangalore Majestic" } },
                ],
            },
        };

        it("should retain trips where origin occurs before destination and reject reverse sequence", async () => {
            const repoSpy = spyOn(tripRepository, "searchTrips").mockResolvedValue([
                mockTripForward,
                mockTripReverse,
            ] as any);

            const results = await tripService.searchTrips("Bangalore", "Salem");

            expect(results.length).toBe(1);
            expect(results[0]?.id).toBe("trip-fwd-1");

            repoSpy.mockRestore();
        });

        it("should fall back to Stop table Levenshtein typo resolution when direct DB query yields no results", async () => {
            let callCount = 0;
            const repoSpy = spyOn(tripRepository, "searchTrips").mockImplementation(async (orig, dest) => {
                callCount++;
                if (orig === "Banaglore" || dest === "Salm") {
                    return []; // Misspelled query returns 0 rows from DB
                }
                if (orig === "Bangalore" && dest === "Salem") {
                    return [mockTripForward] as any; // Resolved typo query returns match
                }
                return [];
            });

            const stopSpy = spyOn(stopRepository, "findAll").mockResolvedValue([
                { id: "s1", name: "Bangalore" },
                { id: "s2", name: "Salem" },
                { id: "s3", name: "Chennai" },
            ] as any);

            const results = await tripService.searchTrips("Banaglore", "Salm");

            expect(results.length).toBe(1);
            expect(results[0]?.id).toBe("trip-fwd-1");
            expect(callCount).toBe(2); // Initial query + targeted corrected query

            repoSpy.mockRestore();
            stopSpy.mockRestore();
        });

        it("should filter out trips if calendar date does not match normalized date", async () => {
            const differentDateTrip = {
                ...mockTripForward,
                departureTime: new Date("2026-11-20T10:00:00.000Z"),
            };
            const repoSpy = spyOn(tripRepository, "searchTrips").mockResolvedValue([differentDateTrip] as any);
            const stopSpy = spyOn(stopRepository, "findAll").mockResolvedValue([]);

            const results = await tripService.searchTrips("Bangalore", "Salem", "2026-11-15");
            expect(results.length).toBe(0);

            repoSpy.mockRestore();
            stopSpy.mockRestore();
        });
    });

    describe("BusLocationService (1Hz Telemetry Stream & Database Throttling)", () => {
        let mockIo: any;
        let emittedRoomEvents: any[] = [];
        let emittedGlobalEvents: any[] = [];

        beforeEach(() => {
            busLocationService.resetThrottleState();
            emittedRoomEvents = [];
            emittedGlobalEvents = [];

            mockIo = {
                to: (room: string) => ({
                    emit: (event: string, payload: any) => {
                        emittedRoomEvents.push({ room, event, payload });
                    },
                }),
                emit: (event: string, payload: any) => {
                    emittedGlobalEvents.push({ event, payload });
                },
            };

            spyOn(socketModule, "getIO").mockReturnValue(mockIo);
        });

        afterEach(() => {
            busLocationService.resetThrottleState();
        });

        it("should broadcast over WebSockets on every tick but throttle DB writes to once within 30s", async () => {
            const busSpy = spyOn(busRepository, "findById").mockResolvedValue({
                id: "bus-throttle-1",
                number: "KA-01-F-1234",
                capacity: 40,
            } as any);

            let upsertCallCount = 0;
            const upsertSpy = spyOn(busLocationRepository, "upsert").mockImplementation(async (busId, lat, lng, head, spd) => {
                upsertCallCount++;
                return {
                    busId,
                    latitude: lat,
                    longitude: lng,
                    heading: head,
                    speed: spd,
                    updatedAt: new Date(),
                } as any;
            });

            // Simulate 5 consecutive 1Hz ticks (1 second apart)
            for (let i = 0; i < 5; i++) {
                await busLocationService.updateLocation(
                    "bus-throttle-1",
                    12.9716 + i * 0.001,
                    77.5946 + i * 0.001,
                    90,
                    45
                );
            }

            // WebSockets must broadcast on EVERY 1Hz tick (smooth marker animation)
            expect(emittedRoomEvents.length).toBe(5);
            expect(emittedGlobalEvents.length).toBe(5);

            // Database upsert must be throttled: exactly 1 write instead of 5
            expect(upsertCallCount).toBe(1);

            // Bus repository findById should be cached and only called once
            expect(busSpy).toHaveBeenCalledTimes(1);

            busSpy.mockRestore();
            upsertSpy.mockRestore();
        });

        it("should immediately persist to DB when forcePersist is true (stop arrival / trip completion)", async () => {
            spyOn(busRepository, "findById").mockResolvedValue({
                id: "bus-force-1",
                number: "KA-01-F-5678",
                capacity: 40,
            } as any);

            let upsertCount = 0;
            const upsertSpy = spyOn(busLocationRepository, "upsert").mockImplementation(async (busId, lat, lng, head, spd) => {
                upsertCount++;
                return { busId, latitude: lat, longitude: lng, heading: head, speed: spd, updatedAt: new Date() } as any;
            });

            // First tick (persisted)
            await busLocationService.updateLocation("bus-force-1", 12.0, 77.0, 0, 0);
            expect(upsertCount).toBe(1);

            // Second tick without forcePersist (throttled)
            await busLocationService.updateLocation("bus-force-1", 12.01, 77.01, 0, 20);
            expect(upsertCount).toBe(1);

            // Third tick with forcePersist: true (e.g. arrived at bus stop)
            await busLocationService.updateLocation("bus-force-1", 12.02, 77.02, 0, 0, { forcePersist: true });
            expect(upsertCount).toBe(2);

            upsertSpy.mockRestore();
        });

        it("should return the latest in-memory coordinates via getLocation without querying DB", async () => {
            spyOn(busRepository, "findById").mockResolvedValue({
                id: "bus-mem-1",
                number: "KA-01-F-9999",
                capacity: 40,
            } as any);

            const dbFindSpy = spyOn(busLocationRepository, "find");
            spyOn(busLocationRepository, "upsert").mockResolvedValue({} as any);

            await busLocationService.updateLocation("bus-mem-1", 13.0827, 80.2707, 180, 50);

            const location = await busLocationService.getLocation("bus-mem-1");
            expect(location).toBeDefined();
            expect(location.latitude).toBe(13.0827);
            expect(location.longitude).toBe(80.2707);

            // Verified: DB was not queried for this live coordinate
            expect(dbFindSpy).toHaveBeenCalledTimes(0);

            dbFindSpy.mockRestore();
        });
    });

    describe("TripController.getAll (Search Query Integration)", () => {
        it("should route to searchTrips when origin and destination query params are provided", async () => {
            const searchSpy = spyOn(tripService, "searchTrips").mockResolvedValue([
                { id: "trip-queried-1" } as any,
            ]);

            let jsonResult: any = null;
            const req: any = {
                query: {
                    origin: "Bangalore",
                    destination: "Goa",
                    date: "2026-11-20",
                },
            };
            const res: any = {
                status: (code: number) => ({
                    json: (data: any) => {
                        jsonResult = data;
                    },
                }),
            };

            await tripController.getAll(req, res, (() => {}) as any);

            expect(searchSpy).toHaveBeenCalledWith("Bangalore", "Goa", "2026-11-20");
            expect(jsonResult).toEqual([{ id: "trip-queried-1" }]);

            searchSpy.mockRestore();
        });

        it("should call findAll when query params are absent", async () => {
            const findAllSpy = spyOn(tripService, "findAll").mockResolvedValue([
                { id: "trip-all-1" } as any,
            ]);

            let jsonResult: any = null;
            const req: any = { query: {} };
            const res: any = {
                status: (code: number) => ({
                    json: (data: any) => {
                        jsonResult = data;
                    },
                }),
            };

            await tripController.getAll(req, res, (() => {}) as any);

            expect(findAllSpy).toHaveBeenCalledTimes(1);
            expect(jsonResult).toEqual([{ id: "trip-all-1" }]);

            findAllSpy.mockRestore();
        });
    });
});
