import { prisma, Prisma } from "@buzo/db";

export class BookingRepository {
    async findAll() {
        return prisma.booking.findMany({
            include: {
                passenger: true,
                seat: true,
                trip: true,
            },
        });
    }

    async createBooking(
        data: Prisma.BookingCreateInput,
        seatId: string
    ) {
        return prisma.$transaction(async (tx) => {
            const booking = await tx.booking.create({
                data,
                include: {
                    passenger: true,
                    seat: true,
                    trip: true,
                },
            });

            await tx.seat.update({
                where: {
                    id: seatId,
                },
                data: {
                    status: "BOOKED",
                },
            });

            return booking;
        });
    }

    async findById(id: string) {
        return prisma.booking.findUnique({
            where: { id },
            include: {
                passenger: true,
                seat: true,
                trip: true,
            },
        });
    }

    async create(data: Prisma.BookingCreateInput) {
        return prisma.booking.create({
            data,
            include: {
                passenger: true,
                seat: true,
                trip: true,
            },
        });
    }

    async delete(id: string) {
        return prisma.booking.delete({
            where: { id },
        });
    }
}

export const bookingRepository =
    new BookingRepository();