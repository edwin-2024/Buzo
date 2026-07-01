import type { Request, Response, NextFunction } from "express";

import { seatRepository } from "../repositories/seat.repository";

export class SeatController {
    getByTrip = async (
        req: Request,
        res: Response,
        next: NextFunction
    ) => {
        try {
            const seats = await seatRepository.findByTripId(
                req.params.tripId
            );

            res.json(seats);
        } catch (err) {
            next(err);
        }
    };
}

export const seatController = new SeatController();