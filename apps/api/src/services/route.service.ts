import { routeRepository } from "../repositories/route.repository";
import { stopRepository } from "../repositories/stop.repository";

import {
    type CreateRouteInput,
    type UpdateRouteInput,
} from "../validation/route.schema";

export class RouteService {
    async findAll() {
        return routeRepository.findAll();
    }

    async findById(id: string) {
        const route = await routeRepository.findById(id);

        if (!route) {
            throw new Error("Route not found");
        }

        return route;
    }

    async create(input: CreateRouteInput) {
        // Check duplicate route name
        const existingRoute = await routeRepository.findByName(input.name);

        if (existingRoute) {
            throw new Error("Route already exists");
        }

        // Validate all stop IDs
        const stopIds = input.stops.map((stop) => stop.stopId);

        const stops = await stopRepository.findManyByIds(stopIds);

        if (stops.length !== stopIds.length) {
            throw new Error("One or more stops do not exist");
        }

        // Create route
        return routeRepository.create({
            name: input.name,
            stops: input.stops.map((stop) => ({
                order: stop.order,
                distanceFromStart: stop.distanceFromStart,
                stop: {
                    connect: {
                        id: stop.stopId,
                    },
                },
            })),
        });
    }

    async update(
        id: string,
        input: UpdateRouteInput
    ) {
        const route = await routeRepository.findById(id);

        if (!route) {
            throw new Error("Route not found");
        }

        if (input.name) {
            const existingRoute = await routeRepository.findByName(
                input.name
            );

            if (existingRoute && existingRoute.id !== id) {
                throw new Error("Route already exists");
            }

            return routeRepository.update(id, input.name);
        }

        return route;
    }

    async delete(id: string) {
        const route = await routeRepository.findById(id);

        if (!route) {
            throw new Error("Route not found");
        }

        await routeRepository.delete(id);
    }
}

export const routeService = new RouteService();