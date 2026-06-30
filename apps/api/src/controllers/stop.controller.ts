import type { Request, Response, NextFunction } from "express";

import { stopService } from "../services/stop.service";
import {
    createStopSchema,
    updateStopSchema,
} from "../validation/stop.schema";

export class StopController {
    getAll = async (
        req: Request,
        res: Response,
        next: NextFunction
    ) => {
        try {
            const stops = await stopService.findAll();

            res.status(200).json(stops);
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
            const stop = await stopService.findById(req.params.id);

            res.status(200).json(stop);
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
            const input = createStopSchema.parse(req.body);

            const stop = await stopService.create(input);

            res.status(201).json(stop);
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
            const input = updateStopSchema.parse(req.body);

            const stop = await stopService.update(
                req.params.id,
                input
            );

            res.status(200).json(stop);
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
            await stopService.delete(req.params.id);

            res.status(204).send();
        } catch (error) {
            next(error);
        }
    };
}

export const stopController = new StopController();