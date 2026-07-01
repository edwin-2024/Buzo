import type { Request, Response, NextFunction } from "express";

import { busService } from "../services/bus.service";

import {
    createBusSchema,
    updateBusSchema,
} from "../validation/bus.schema";

export class BusController {
    getAll = async (
        req: Request,
        res: Response,
        next: NextFunction
    ) => {
        try {
            const buses = await busService.findAll();

            res.status(200).json(buses);
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
            const bus = await busService.findById(req.params.id);

            res.status(200).json(bus);
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
            const input = createBusSchema.parse(req.body);

            const bus = await busService.create(input);

            res.status(201).json(bus);
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
            const input = updateBusSchema.parse(req.body);

            const bus = await busService.update(
                req.params.id,
                input
            );

            res.status(200).json(bus);
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
            await busService.delete(req.params.id);

            res.status(204).send();
        } catch (error) {
            next(error);
        }
    };
}

export const busController = new BusController();