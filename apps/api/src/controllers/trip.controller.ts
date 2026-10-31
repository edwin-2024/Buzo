import type { NextFunction, Request, Response } from "express";

import { tripService } from "../services/trip.service";

import {
    createTripSchema,
    updateTripSchema,
} from "../validation/trip.schema";

export class TripController {
    getAll = async (
        req: Request,
        res: Response,
        next: NextFunction
    ) => {
        try {
            const { origin, destination, date } = req.query;
            if (origin && destination) {
                const trips = await tripService.searchTrips(
                    String(origin),
                    String(destination),
                    date ? String(date) : undefined
                );
                return res.status(200).json(trips);
            }

            const trips = await tripService.findAll();
            res.status(200).json(trips);
        } catch (error) {
            next(error);
        }
    };

    getMyTrips = async (
        req: Request,
        res: Response,
        next: NextFunction
    ) => {
        try {
            // Find driver profile for the user
            const driver = await tripService.findDriverByUserId(req.user?.userId!);
            if (!driver || !driver.assignedBusId) {
                return res.status(200).json([]);
            }
            
            const trips = await tripService.findTripsByBusId(driver.assignedBusId);
            res.status(200).json(trips);
        } catch (error) {
            next(error);
        }
    };

    getById = async (
        req: Request,
        res: Response,
        next: NextFunction
    ) => {
        try {
            const trip = await tripService.findById(req.params.id as string);

            res.status(200).json(trip);
        } catch (error) {
            next(error);
        }
    };

    create = async (
        req: Request,
        res: Response,
        next: NextFunction
    ) => {
        try {
            const input = createTripSchema.parse(req.body);

            const trip = await tripService.create(input);

            res.status(201).json(trip);
        } catch (error) {
            next(error);
        }
    };

    update = async (
        req: Request,
        res: Response,
        next: NextFunction
    ) => {
        try {
            const input = updateTripSchema.parse(req.body);

            if (req.user?.role === "DRIVER") {
                const trip = await tripService.findById(req.params.id as string);
                if (!trip) {
                    return res.status(404).json({ message: "Trip not found" });
                }
                const driver = await tripService.findDriverByUserId(req.user.userId);
                if (!driver || driver.assignedBusId !== trip.busId) {
                    return res.status(403).json({
                        message: "Forbidden: You can only update trips assigned to your bus",
                    });
                }
            }

            const trip = await tripService.update(
                req.params.id as string,
                input
            );

            res.status(200).json(trip);
        } catch (error) {
            next(error);
        }
    };

    delete = async (
        req: Request,
        res: Response,
        next: NextFunction
    ) => {
        try {
            await tripService.delete(req.params.id as string);

            res.sendStatus(204);
        } catch (error) {
            next(error);
        }
    };
}

export const tripController = new TripController();