import type { Request, Response, NextFunction } from "express";

import { busLocationService } from "../services/bus-location.service";
import { updateBusLocationSchema } from "../validation/bus-location.schema";

export class BusLocationController {
    update = async (
        req: Request,
        res: Response,
        next: NextFunction
    ) => {
        try {
            const input = updateBusLocationSchema.parse(req.body);

            const location =
                await busLocationService.updateLocation(
                    req.params.busId,
                    input.latitude,
                    input.longitude,
                    input.heading,
                    input.speed
                );

            res.json(location);
        } catch (err) {
            next(err);
        }
    };

    get = async (
        req: Request,
        res: Response,
        next: NextFunction
    ) => {
        try {
            const location =
                await busLocationService.getLocation(
                    req.params.busId
                );

            res.json(location);
        } catch (err) {
            next(err);
        }
    };
}

export const busLocationController =
    new BusLocationController();