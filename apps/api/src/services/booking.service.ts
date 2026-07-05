import { prisma, SeatStatus } from "@buzo/db";

import { bookingRepository } from "../repositories/booking.repository";
import { seatRepository } from "../repositories/seat.repository";
import { tripRepository } from "../repositories/trip.repository";
import { userRepository } from "../repositories/user.repository";

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
            if (seat.status !== SeatStatus.AVAILABLE) {
                throw new Error(`Seat ${seatId} already booked`);
            }
            seats.push(seat);
        }

        return bookingRepository.createBooking(
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
    }

    async delete(id: string) {
        const booking = await this.findById(id);

        await prisma.$transaction(async (tx) => {
            await tx.booking.delete({ where: { id } });
            await tx.seat.update({
                where: { id: booking.seatId },
                data: { status: "AVAILABLE" },
            });
        });
    }

}

export const bookingService =
    new BookingService();