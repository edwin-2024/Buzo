import { tripRepository } from "../repositories/trip.repository";
import { busRepository } from "../repositories/bus.repository";
import { routeRepository } from "../repositories/route.repository";

import type {
    CreateTripInput,
    UpdateTripInput,
} from "../validation/trip.schema";

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

        return tripRepository.create({
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
    }

    async update(
        id: string,
        input: UpdateTripInput
    ) {
        await this.findById(id);

        return tripRepository.update(id, input);
    }

    async delete(id: string) {
        await this.findById(id);

        return tripRepository.delete(id);
    }
}

export const tripService = new TripService();