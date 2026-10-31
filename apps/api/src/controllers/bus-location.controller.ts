import type { Request, Response, NextFunction } from "express";

import { busLocationService } from "../services/bus-location.service";
import { updateBusLocationSchema } from "../validation/bus-location.schema";
import { driverRepository } from "../repositories/driver.repository";

export class BusLocationController {
    update = async (
        req: Request,
        res: Response,
        next: NextFunction
    ) => {
        try {
            const busId = req.params.busId as string;
            if (!busId) {
                return res.status(400).json({ message: "busId is required" });
            }

            // Authorization check: DRIVER can only broadcast for their assigned bus; ADMIN can update any
            if (req.user?.role === "DRIVER") {
                const driver = await driverRepository.findByUserId(req.user.userId);
                if (!driver || driver.assignedBusId !== busId) {
                    return res.status(403).json({
                        message: "Forbidden: You are not authorized to update telemetry for this bus",
                    });
                }
            }

            const input = updateBusLocationSchema.parse(req.body);

            const location =
                await busLocationService.updateLocation(
                    busId,
                    input.latitude,
                    input.longitude,
                    input.heading,
                    input.speed,
                    { forcePersist: input.forcePersist }
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
                    req.params.busId as string
                );

            res.json(location);
        } catch (err) {
            next(err);
        }
    };

    getAll = async (
        req: Request,
        res: Response,
        next: NextFunction
    ) => {
        try {
            const locations = await busLocationService.getAllLocations();
            res.json(locations);
        } catch (err) {
            next(err);
        }
    };
}

export const busLocationController =
    new BusLocationController();
