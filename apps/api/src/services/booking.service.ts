import { SeatStatus } from "@buzo/db";

import { bookingRepository } from "../repositories/booking.repository";
import { seatRepository } from "../repositories/seat.repository";
import { tripRepository } from "../repositories/trip.repository";
import { userRepository } from "../repositories/user.repository";

import type { CreateBookingInput } from "../validation/booking.schema";

export class BookingService {
    async findAll() {
        return bookingRepository.findAll();
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

        const seat =
            await seatRepository.findById(input.seatId);

        if (!seat) {
            throw new Error("Seat not found");
        }

        if (seat.tripId !== input.tripId) {
            throw new Error(
                "Seat does not belong to this trip"
            );
        }

        if (seat.status !== SeatStatus.AVAILABLE) {
            throw new Error("Seat already booked");
        }

        return bookingRepository.createBooking(
            {
                passenger: {
                    connect: {
                        id: passengerId,
                    },
                },
                seat: {
                    connect: {
                        id: seat.id,
                    },
                },
                trip: {
                    connect: {
                        id: trip.id,
                    },
                },
                paymentStatus: "PENDING",
            },
            seat.id
        );
    }

    async delete(id: string) {
        await this.findById(id);

        return bookingRepository.delete(id);
    }
}

export const bookingService =
    new BookingService();