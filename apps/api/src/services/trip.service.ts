import { tripRepository } from "../repositories/trip.repository";
import { busRepository } from "../repositories/bus.repository";
import { routeRepository } from "../repositories/route.repository";

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
                status: "AVAILABLE",
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

    async searchTrips(
        origin: string,
        destination: string
    ) {
        const trips = await tripRepository.searchTrips(
            origin,
            destination
        );

        return trips.filter((trip) => {
            const originIndex = trip.route.stops.findIndex(
                (s) =>
                    s.stop.name.toLowerCase() === origin.toLowerCase()
            );

            const destinationIndex = trip.route.stops.findIndex(
                (s) =>
                    s.stop.name.toLowerCase() === destination.toLowerCase()
            );

            return (
                originIndex !== -1 &&
                destinationIndex !== -1 &&
                originIndex < destinationIndex
            );
        });
    }

    async delete(id: string) {
        await this.findById(id);

        return tripRepository.delete(id);
    }
}

export const tripService = new TripService();