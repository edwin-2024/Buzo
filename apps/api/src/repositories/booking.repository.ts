import { prisma } from "@repo/db";

export class BookingRepository {
    async create(data: {
        tripId: string;
        passengerId: string;
        seatId: string;
    }) {
        return prisma.booking.create({
            data,
        });
    }

    async findByPassenger(passengerId: string) {
        return prisma.booking.findMany({
            where: {
                passengerId,
            },
            include: {
                trip: true,
                seat: true,
            },
        });
    }
}

export const bookingRepository = new BookingRepository();