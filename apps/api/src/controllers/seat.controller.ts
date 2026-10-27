import type { Request, Response, NextFunction } from "express";

import { seatRepository } from "../repositories/seat.repository";
import { bookingService } from "../services/booking.service";
import { getSeatTier, type EnrichedSeat } from "../lib/seat-pricing";

export class SeatController {
    getByTrip = async (
        req: Request,
        res: Response,
        next: NextFunction
    ) => {
        try {
            const tripId = (req.params.tripId || req.params.id) as string;

            // Self-healing lazy reclamation: release any expired reservations on this trip
            // Gracefully handled so transient background sweeper glitches never block read traffic
            await bookingService.cleanupExpiredReservations(tripId).catch(() => {});

            const seats = await seatRepository.findByTripId(tripId);

            const enrichedSeats: EnrichedSeat[] = seats.map((seat) => {
                const pricing = getSeatTier(seat.seatNumber);
                return {
                    ...seat,
                    tier: pricing.tier,
                    tierName: pricing.name,
                    price: pricing.price,
                    perks: pricing.perks,
                };
            });

            res.json(enrichedSeats);
        } catch (err) {
            next(err);
        }
    };
}

export const seatController = new SeatController();
