import { tripRepository } from "../repositories/trip.repository";
import { busRepository } from "../repositories/bus.repository";
import { routeRepository } from "../repositories/route.repository";
import { SeatStatus } from "@buzo/db";

import type {
    CreateTripInput,
    UpdateTripInput,
} from "../validation/trip.schema";
import { seatRepository } from "../repositories/seat.repository";

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

    async searchTrips(
        origin: string,
        destination: string,
        date?: string
    ) {
        const trips = await tripRepository.searchTrips(
            origin,
            destination
        );

        // Normalize date once
        const normalizedDate = date ? this.normalizeDate(date) : undefined;

        return trips.filter((trip) => {
            // Check route match
            const originIndex = trip.route.stops.findIndex(
                (s) =>
                    s.stop.name.toLowerCase().includes(origin.toLowerCase())
            );

            const destinationIndex = trip.route.stops.findIndex(
                (s) =>
                    s.stop.name.toLowerCase().includes(destination.toLowerCase())
            );

            if (originIndex === -1 || destinationIndex === -1 || originIndex >= destinationIndex) {
                return false;
            }
            
            // Check date match if provided
            if (normalizedDate) {
                const tripDate = trip.departureTime.toISOString().split('T')[0];
                if (tripDate !== normalizedDate) {
                    return false;
                }
            }
            
            return true;
        });
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