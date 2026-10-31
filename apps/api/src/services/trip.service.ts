import { tripRepository } from "../repositories/trip.repository";
import { busRepository } from "../repositories/bus.repository";
import { routeRepository } from "../repositories/route.repository";
import { SeatStatus } from "@buzo/db";

import type {
    CreateTripInput,
    UpdateTripInput,
} from "../validation/trip.schema";
import { seatRepository } from "../repositories/seat.repository";
import { stopRepository } from "../repositories/stop.repository";

export class TripService {
    async findAll() {
        return tripRepository.findAll();
    }

    async findById(id: string) {
        const trip = await tripRepository.findById(id);

        if (!trip) throw new Error("Trip not found");

        return trip;
    }

    async create(input: CreateTripInput) {
        const bus = await busRepository.findById(input.busId);

        if (!bus) throw new Error("Bus not found");

        const route = await routeRepository.findById(
            input.routeId
        );

        if (!route) throw new Error("Route not found");

        if (input.arrivalTime <= input.departureTime) {
            throw new Error(
                "Arrival time must be after departure time"
            );
        }
        const trip = await tripRepository.create({
            departureTime: input.departureTime,
            arrivalTime: input.arrivalTime,
            status: input.status,
            bus: {
                connect: {
                    id: input.busId,
                },
            },
            route: {
                connect: {
                    id: input.routeId,
                },
            },
        });

        const seats = Array.from(
            { length: bus.capacity },
            (_, index) => ({
                tripId: trip.id,
                seatNumber: index + 1,
                status: SeatStatus.AVAILABLE,
            })
        );

        await seatRepository.createMany(seats);

        return trip;

    }

    async update(
        id: string,
        input: UpdateTripInput
    ) {
        await this.findById(id);

        return tripRepository.update(id, input);
    }

    /**
     * Normalize a date string that might be a relative date
     * (e.g. "tomorrow", "today") or a YYYY-MM-DD string.
     * Returns YYYY-MM-DD or undefined if unparseable.
     */
    private normalizeDate(date: string): string | undefined {
        const lower = date.trim().toLowerCase();

        const now = new Date();

        if (lower === "today") {
            return now.toISOString().split("T")[0];
        }
        if (lower === "tomorrow") {
            const d = new Date(now);
            d.setDate(d.getDate() + 1);
            return d.toISOString().split("T")[0];
        }
        if (lower === "day after tomorrow") {
            const d = new Date(now);
            d.setDate(d.getDate() + 2);
            return d.toISOString().split("T")[0];
        }

        // Try to parse as a date string
        const parsed = new Date(date);
        if (!isNaN(parsed.getTime())) {
            return parsed.toISOString().split("T")[0];
        }

        return undefined;
    }

    private levenshteinDistance(a: string, b: string): number {
        const aLen = a.length;
        const bLen = b.length;
        if (aLen === 0) return bLen;
        if (bLen === 0) return aLen;

        const matrix: number[][] = Array.from({ length: aLen + 1 }, () => Array(bLen + 1).fill(0));
        for (let i = 0; i <= aLen; i++) {
            const row = matrix[i];
            if (row) row[0] = i;
        }
        const firstRow = matrix[0];
        if (firstRow) {
            for (let j = 0; j <= bLen; j++) firstRow[j] = j;
        }
        for (let i = 1; i <= aLen; i++) {
            const row = matrix[i];
            const prevRow = matrix[i - 1];
            if (!row || !prevRow) continue;
            for (let j = 1; j <= bLen; j++) {
                if (a[i - 1] === b[j - 1]) {
                    row[j] = prevRow[j - 1] ?? 0;
                } else {
                    row[j] = Math.min(
                        prevRow[j - 1] ?? 0,
                        row[j - 1] ?? 0,
                        prevRow[j] ?? 0
                    ) + 1;
                }
            }
        }
        return matrix[aLen]?.[bLen] ?? 99;
    }

    private cleanStopName(name: string): string {
        return name.toLowerCase().replace(/[^a-z0-9]/g, '');
    }

    private findClosestStopName(query: string, candidateNames: string[]): string | null {
        const cleanQuery = this.cleanStopName(query);
        if (!cleanQuery) return null;

        let bestMatch: string | null = null;
        let lowestDistance = 999;

        for (const name of candidateNames) {
            const cleanName = this.cleanStopName(name);
            if (cleanName === cleanQuery || cleanName.includes(cleanQuery) || cleanQuery.includes(cleanName)) {
                return name;
            }

            const dist = this.levenshteinDistance(cleanQuery, cleanName);
            if (dist <= 3 && dist < lowestDistance) {
                lowestDistance = dist;
                bestMatch = name;
            }
        }

        return bestMatch;
    }

    isSimilar(a: string, b: string): boolean {
        const cleanA = this.cleanStopName(a);
        const cleanB = this.cleanStopName(b);
        if (cleanA.includes(cleanB) || cleanB.includes(cleanA)) return true;
        return this.levenshteinDistance(cleanA, cleanB) <= 3;
    }

    async searchTrips(
        origin?: string,
        destination?: string,
        date?: string
    ) {
        if (!origin || !destination) {
            return [];
        }

        const normalizedDate = date ? this.normalizeDate(date) : undefined;

        // Step 1: Indexed, relation-filtered query pushed to PostgreSQL
        let candidateTrips = await tripRepository.searchTrips(
            origin,
            destination,
            normalizedDate
        );

        const filterStopOrder = (trips: typeof candidateTrips, orig: string, dest: string) => {
            const cleanOrig = this.cleanStopName(orig);
            const cleanDest = this.cleanStopName(dest);

            return trips.filter((trip) => {
                const originIndex = trip.route.stops.findIndex((s) => {
                    const stopName = this.cleanStopName(s.stop.name);
                    return stopName.includes(cleanOrig) || cleanOrig.includes(stopName);
                });

                const destinationIndex = trip.route.stops.findIndex((s) => {
                    const stopName = this.cleanStopName(s.stop.name);
                    return stopName.includes(cleanDest) || cleanDest.includes(stopName);
                });

                if (originIndex === -1 || destinationIndex === -1 || originIndex >= destinationIndex) {
                    return false;
                }

                if (normalizedDate) {
                    const tripDate = trip.departureTime.toISOString().split('T')[0];
                    if (tripDate !== normalizedDate) {
                        return false;
                    }
                }

                return true;
            });
        };

        let matches = filterStopOrder(candidateTrips, origin, destination);
        if (matches.length > 0) {
            return matches;
        }

        // Step 2: Typo-tolerant fallback - resolve closest stop names from Stop table instead of scanning trips
        const allStops = await stopRepository.findAll();
        const candidateNames = allStops.map((s) => s.name);
        const resolvedOrigin = this.findClosestStopName(origin, candidateNames) || origin;
        const resolvedDest = this.findClosestStopName(destination, candidateNames) || destination;

        if (resolvedOrigin !== origin || resolvedDest !== destination) {
            candidateTrips = await tripRepository.searchTrips(
                resolvedOrigin,
                resolvedDest,
                normalizedDate
            );
            matches = filterStopOrder(candidateTrips, resolvedOrigin, resolvedDest);
        }

        return matches;
    }

    async delete(id: string) {
        await this.findById(id);

        return tripRepository.delete(id);
    }

    async findDriverByUserId(userId: string) {
        return tripRepository.findDriverByUserId(userId);
    }

    async findTripsByBusId(busId: string) {
        return tripRepository.findTripsByBusId(busId);
    }
}

export const tripService = new TripService();