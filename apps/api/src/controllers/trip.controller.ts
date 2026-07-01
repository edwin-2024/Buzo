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
            const trips = await tripService.findAll();

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
            const trip = await tripService.findById(req.params.id);

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

            const trip = await tripService.update(
                req.params.id,
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
            await tripService.delete(req.params.id);

            res.sendStatus(204);
        } catch (error) {
            next(error);
        }
    };
}

export const tripController = new TripController();