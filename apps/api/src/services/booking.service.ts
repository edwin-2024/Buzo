import { prisma, SeatStatus } from "@buzo/db";

import { bookingRepository } from "../repositories/booking.repository";
import { seatRepository } from "../repositories/seat.repository";
import { tripRepository } from "../repositories/trip.repository";
import { userRepository } from "../repositories/user.repository";
import { broadcastSeatUpdate } from "../realtime/socket";

import type { CreateBookingInput } from "../validation/booking.schema";

export class BookingService {
    async findAll() {
        return bookingRepository.findAll();
    }

    async findMyBookings(passengerId: string) {
        return bookingRepository.findMyBookings(passengerId);
    }

    async findById(id: string) {
        const booking = await bookingRepository.findById(id);

        if (!booking) {
            throw new Error("Booking not found");
        }

        return booking;
    }

    async create(
        passengerId: string,
        input: CreateBookingInput
    ) {
        // Step 1: Eagerly sweep any expired reservations on this trip
        await this.cleanupExpiredReservations(input.tripId);

        const passenger =
            await userRepository.findById(passengerId);

        if (!passenger) {
            throw new Error("Passenger not found");
        }

        const trip =
            await tripRepository.findById(input.tripId);

        if (!trip) {
            throw new Error("Trip not found");
        }

        const seats = [];
        for (const seatId of input.seatIds) {
            const seat = await seatRepository.findById(seatId);
            if (!seat) {
                throw new Error(`Seat ${seatId} not found`);
            }
            if (seat.tripId !== input.tripId) {
                throw new Error(`Seat ${seatId} does not belong to this trip`);
            }
            seats.push(seat);
        }

        const bookings = await bookingRepository.createBooking(
            {
                passenger: {
                    connect: {
                        id: passengerId,
                    },
                },
                trip: {
                    connect: {
                        id: trip.id,
                    },
                },
                paymentStatus: "PENDING",
            },
            input.seatIds
        );

        // Notify all clients on this trip about the newly reserved seats
        broadcastSeatUpdate(input.tripId, input.seatIds, SeatStatus.RESERVED);

        return bookings;
    }

    async confirmPayment(passengerId: string, tripId: string) {
        const result = await bookingRepository.confirmPayment(passengerId, tripId);

        // Notify all clients that these seats are now confirmed booked
        broadcastSeatUpdate(tripId, result.seatIds, SeatStatus.BOOKED);

        return result;
    }

    async cleanupExpiredReservations(tripId?: string) {
        const result = await bookingRepository.cleanupExpiredReservations(tripId);

        if (result.releasedCount > 0) {
            console.log(`🧹 Reclaimed ${result.releasedCount} expired seat reservations.`);
            const tripSeatMap = (result as any).tripSeatMap as [string, string[]][] | undefined;
            if (tripSeatMap && tripSeatMap.length > 0) {
                for (const [tId, tSeatIds] of tripSeatMap) {
                    broadcastSeatUpdate(tId, tSeatIds, SeatStatus.AVAILABLE);
                }
            } else {
                for (const tId of result.tripIds) {
                    broadcastSeatUpdate(tId, result.seatIds, SeatStatus.AVAILABLE);
                }
            }
        }

        return result;
    }

    async cancelPendingReservations(passengerId: string, tripId: string) {
        const seatIds = await bookingRepository.cancelPendingReservations(passengerId, tripId);

        if (seatIds.length > 0) {
            broadcastSeatUpdate(tripId, seatIds, SeatStatus.AVAILABLE);
        }

        return seatIds;
    }

    async delete(id: string) {
        const booking = await this.findById(id);

        await prisma.$transaction(async (tx) => {
            await tx.booking.delete({ where: { id } });
            await tx.seat.update({
                where: { id: booking.seatId },
                data: { status: SeatStatus.AVAILABLE },
            });
        });

        broadcastSeatUpdate(booking.tripId, [booking.seatId], SeatStatus.AVAILABLE);
    }
}

export const bookingService =
    new BookingService();
