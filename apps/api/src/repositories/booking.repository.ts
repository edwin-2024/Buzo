import { prisma, Prisma } from "@buzo/db";

export class BookingRepository {
    async findAll() {
        return prisma.booking.findMany({
            include: {
                passenger: true,
                seat: true,
                trip: {
                    include: {
                        route: true,
                        bus: true
                    }
                },
            },
        });
    }

    async findMyBookings(passengerId: string) {
        return prisma.booking.findMany({
            where: { passengerId },
            include: {
                passenger: true,
                seat: true,
                trip: {
                    include: {
                        route: true,
                        bus: true
                    }
                },
            },
            orderBy: {
                trip: {
                    departureTime: "desc"
                }
            }
        });
    }

    async createBooking(
        data: Omit<Prisma.BookingCreateInput, 'seat'>,
        seatIds: string[]
    ) {
        const bookingPromises = seatIds.map(seatId => 
            prisma.booking.create({
                data: {
                    ...data,
                    seat: { connect: { id: seatId } }
                },
                include: {
                    passenger: true,
                    seat: true,
                    trip: {
                        include: {
                            route: true,
                            bus: true
                        }
                    },
                },
            })
        );

        const updateSeatsPromise = prisma.seat.updateMany({
            where: { id: { in: seatIds } },
            data: { status: "BOOKED" },
        });

        const results = await prisma.$transaction([
            ...bookingPromises,
            updateSeatsPromise
        ], {
            maxWait: 10000,
            timeout: 30000,
        });

        results.pop(); // Remove the updateMany result
        return results as any;
    }

    async findById(id: string) {
        return prisma.booking.findUnique({
            where: { id },
            include: {
                passenger: true,
                seat: true,
                trip: {
                    include: {
                        route: true,
                        bus: true
                    }
                },
            },
        });
    }

    async create(data: Prisma.BookingCreateInput) {
        return prisma.booking.create({
            data,
            include: {
                passenger: true,
                seat: true,
                trip: {
                    include: {
                        route: true,
                        bus: true
                    }
                },
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