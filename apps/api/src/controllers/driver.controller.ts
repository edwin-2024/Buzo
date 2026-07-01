import type { Request, Response, NextFunction } from "express";

import { driverService } from "../services/driver.service";

import {
    createDriverSchema,
    assignBusSchema,
} from "../validation/driver.schema";

export class DriverController {
    getAll = async (req: Request, res: Response, next: NextFunction) => {
        try {
            res.json(await driverService.findAll());
        } catch (err) {
            next(err);
        }
    };

    getById = async (req: Request, res: Response, next: NextFunction) => {
        try {
            res.json(await driverService.findById(req.params.id));
        } catch (err) {
            next(err);
        }
    };

    create = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const input = createDriverSchema.parse(req.body);

            res.status(201).json(await driverService.create(input));
        } catch (err) {
            next(err);
        }
    };

    assignBus = async (
        req: Request,
        res: Response,
        next: NextFunction
    ) => {
        try {
            const input = assignBusSchema.parse(req.body);

            res.json(
                await driverService.assignBus(
                    req.params.id,
                    input
                )
            );
        } catch (err) {
            next(err);
        }
    };

    delete = async (req: Request, res: Response, next: NextFunction) => {
        try {
            await driverService.delete(req.params.id);

            res.sendStatus(204);
        } catch (err) {
            next(err);
        }
    };
}

export const driverController = new DriverController();