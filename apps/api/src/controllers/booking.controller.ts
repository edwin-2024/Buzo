import type { Request, Response, NextFunction } from "express";

import { bookingService } from "../services/booking.service";
import { receiptService } from "../services/receipt.service";
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

    getMyBookings = async (
        req: Request,
        res: Response,
        next: NextFunction
    ) => {
        try {
            const bookings = await bookingService.findMyBookings(req.user.userId);

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
            let booking;
            try {
                booking = await bookingService.findById(req.params.id as string);
            } catch {
                return res.status(404).json({ message: "Booking not found" });
            }

            if (!booking) {
                return res.status(404).json({ message: "Booking not found" });
            }

            if (booking.passengerId !== req.user.userId && req.user.role !== "ADMIN") {
                return res.status(403).json({
                    message: "Forbidden: You do not have permission to view this booking",
                });
            }

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

    cancelPending = async (
        req: Request,
        res: Response,
        next: NextFunction
    ) => {
        try {
            const { tripId } = req.body;
            if (!tripId || typeof tripId !== "string") {
                return res.status(400).json({ message: "tripId is required" });
            }

            const releasedSeatIds = await bookingService.cancelPendingReservations(
                req.user.userId,
                tripId
            );

            res.status(200).json({
                message: "Pending reservation cancelled successfully",
                releasedSeatIds,
            });
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
            let booking;
            try {
                booking = await bookingService.findById(req.params.id as string);
            } catch {
                return res.status(404).json({ message: "Booking not found" });
            }

            if (!booking) {
                return res.status(404).json({ message: "Booking not found" });
            }

            if (booking.passengerId !== req.user.userId && req.user.role !== "ADMIN") {
                return res.status(403).json({
                    message: "Forbidden: You do not have permission to delete this booking",
                });
            }

            await bookingService.delete(req.params.id as string);

            res.sendStatus(204);
        } catch (error) {
            next(error);
        }
    };

    getReceipt = async (
        req: Request,
        res: Response,
        next: NextFunction
    ) => {
        try {
            let booking;
            try {
                booking = await bookingService.findById(req.params.id as string);
            } catch {
                return res.status(404).json({ message: "Booking not found" });
            }

            if (!booking) {
                return res.status(404).json({ message: "Booking not found" });
            }

            // Access control: passenger who owns booking or admin
            if (booking.passengerId !== req.user.userId && req.user.role !== "ADMIN") {
                return res.status(403).json({
                    message: "Forbidden: You do not have permission to access this receipt",
                });
            }

            const pdfBuffer = receiptService.generateReceiptPdf(booking);

            res.setHeader("Content-Type", "application/pdf");
            res.setHeader(
                "Content-Disposition",
                `attachment; filename="buzo-receipt-${booking.id}.pdf"`
            );
            res.setHeader("Content-Length", pdfBuffer.length);

            return res.status(200).send(pdfBuffer);
        } catch (error) {
            next(error);
        }
    };

    emailReceipt = async (
        req: Request,
        res: Response,
        next: NextFunction
    ) => {
        try {
            let booking;
            try {
                booking = await bookingService.findById(req.params.id as string);
            } catch {
                return res.status(404).json({ message: "Booking not found" });
            }

            if (!booking) {
                return res.status(404).json({ message: "Booking not found" });
            }

            // Access control
            if (booking.passengerId !== req.user.userId && req.user.role !== "ADMIN") {
                return res.status(403).json({
                    message: "Forbidden: You do not have permission to email this receipt",
                });
            }

            const result = await receiptService.sendReceiptEmail(booking);
            return res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    };
}

export const bookingController = new BookingController();
