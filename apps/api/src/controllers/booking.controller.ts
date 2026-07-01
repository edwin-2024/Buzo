import type { Request, Response, NextFunction } from "express";

import { bookingService } from "../services/booking.service";
import { createBookingSchema } from "../validation/booking.schema";

export class BookingController {
    getAll = async (
        req: Request,
        res: Response,
        next: NextFunction
    ) => {
        try {
            const bookings = await bookingService.findAll();

            res.status(200).json(bookings);
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
            const booking = await bookingService.findById(req.params.id);

            res.status(200).json(booking);
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
            const input = createBookingSchema.parse(req.body);

            const booking = await bookingService.create(
                req.user.userId,
                input
            );

            res.status(201).json(booking);
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
            await bookingService.delete(req.params.id);

            res.sendStatus(204);
        } catch (error) {
            next(error);
        }
    };
}

export const bookingController = new BookingController();