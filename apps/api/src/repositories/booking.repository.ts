import { prisma, Prisma, SeatStatus } from "@buzo/db";
import { RESERVATION_HOLD_MS } from "../config/reservation.config";

const safePassengerSelect = {
    id: true,
    name: true,
    email: true,
    role: true,
    createdAt: true,
    updatedAt: true,
};

export class BookingRepository {
    private async releasePendingSeats(
        tx: Prisma.TransactionClient,
        bookingIds: string[],
        seatIds: string[]
    ) {
        if (bookingIds.length > 0) {
            await tx.booking.deleteMany({
                where: { id: { in: bookingIds } },
            });
        }
        if (seatIds.length > 0) {
            await tx.seat.updateMany({
                where: { id: { in: seatIds } },
                data: { status: SeatStatus.AVAILABLE },
            });
        }
    }

    async findAll() {
        return prisma.booking.findMany({
            include: {
                passenger: { select: safePassengerSelect },
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
                passenger: { select: safePassengerSelect },
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
        return prisma.$transaction(async (tx) => {
            // Step 1: Reclaim any expired reservations specifically holding these seatIds
            const cutoffDate = new Date(Date.now() - RESERVATION_HOLD_MS);
            const expiredOnSeats = await tx.booking.findMany({
                where: {
                    seatId: { in: seatIds },
                    paymentStatus: "PENDING",
                    createdAt: { lt: cutoffDate },
                },
                select: { id: true, seatId: true },
            });

            if (expiredOnSeats.length > 0) {
                const expiredBookingIds = expiredOnSeats.map((b) => b.id);
                const expiredSeatIds = expiredOnSeats.map((b) => b.seatId);

                await this.releasePendingSeats(tx, expiredBookingIds, expiredSeatIds);
            }

            // Step 2: Atomic conditional update with row-level locks
            const updateResult = await tx.seat.updateMany({
                where: {
                    id: { in: seatIds },
                    status: SeatStatus.AVAILABLE,
                },
                data: { status: SeatStatus.RESERVED },
            });

            if (updateResult.count !== seatIds.length) {
                throw new Error("One or more selected seats are no longer available or currently held by another passenger");
            }

            // Step 3: Create pending reservation records
            const bookings = [];
            for (const seatId of seatIds) {
                const booking = await tx.booking.create({
                    data: {
                        ...data,
                        seat: { connect: { id: seatId } },
                    },
                    include: {
                        passenger: { select: safePassengerSelect },
                        seat: true,
                        trip: {
                            include: {
                                route: true,
                                bus: true,
                            },
                        },
                    },
                });
                bookings.push(booking);
            }

            return bookings;
        }, {
            maxWait: 10000,
            timeout: 30000,
        });
    }

    async confirmPayment(passengerId: string, tripId: string) {
        return prisma.$transaction(async (tx) => {
            const pendingBookings = await tx.booking.findMany({
                where: {
                    tripId,
                    passengerId,
                    paymentStatus: "PENDING",
                },
                include: { seat: true },
            });

            if (!pendingBookings || pendingBookings.length === 0) {
                throw new Error("No pending reservation found for this trip");
            }

            // Check if reservation hold exceeded 10 minutes
            const cutoffDate = new Date(Date.now() - RESERVATION_HOLD_MS);
            const isExpired = pendingBookings.some((b) => b.createdAt < cutoffDate);

            if (isExpired) {
                const seatIds = pendingBookings.map((b) => b.seatId);
                await this.releasePendingSeats(tx, pendingBookings.map((b) => b.id), seatIds);
                throw new Error("Reservation has expired (10-minute hold exceeded). Please select your seats again.");
            }

            // Confirm payment & lock seats to BOOKED status
            const seatIds = pendingBookings.map((b) => b.seatId);
            await tx.booking.updateMany({
                where: { id: { in: pendingBookings.map((b) => b.id) } },
                data: { paymentStatus: "PAID" },
            });
            await tx.seat.updateMany({
                where: { id: { in: seatIds } },
                data: { status: SeatStatus.BOOKED },
            });

            return {
                seatIds,
                bookings: pendingBookings,
            };
        }, {
            maxWait: 10000,
            timeout: 30000,
        });
    }

    async cleanupExpiredReservations(tripId?: string) {
        const cutoffDate = new Date(Date.now() - RESERVATION_HOLD_MS);
        const whereClause: Prisma.BookingWhereInput = {
            paymentStatus: "PENDING",
            createdAt: { lt: cutoffDate },
            ...(tripId ? { tripId } : {}),
        };

        const expiredBookings = await prisma.booking.findMany({
            where: whereClause,
            select: { id: true, seatId: true, tripId: true },
        });

        if (expiredBookings.length === 0) {
            return { releasedCount: 0, seatIds: [], tripIds: [], tripSeatMap: [] };
        }

        const bookingIds = expiredBookings.map((b) => b.id);
        const seatIds = expiredBookings.map((b) => b.seatId);
        const tripIds = Array.from(new Set(expiredBookings.map((b) => b.tripId)));

        const map = new Map<string, string[]>();
        for (const b of expiredBookings) {
            const list = map.get(b.tripId) || [];
            list.push(b.seatId);
            map.set(b.tripId, list);
        }

        await prisma.$transaction(async (tx) => {
            await this.releasePendingSeats(tx, bookingIds, seatIds);
        }, {
            maxWait: 10000,
            timeout: 20000,
        });

        return {
            releasedCount: expiredBookings.length,
            seatIds,
            tripIds,
            tripSeatMap: Array.from(map.entries()),
        };
    }

    async cancelPendingReservations(passengerId: string, tripId: string) {
        return prisma.$transaction(async (tx) => {
            const pendingBookings = await tx.booking.findMany({
                where: {
                    passengerId,
                    tripId,
                    paymentStatus: "PENDING",
                },
                select: { id: true, seatId: true },
            });

            if (pendingBookings.length === 0) {
                return [];
            }

            const bookingIds = pendingBookings.map((b) => b.id);
            const seatIds = pendingBookings.map((b) => b.seatId);

            await this.releasePendingSeats(tx, bookingIds, seatIds);

            return seatIds;
        });
    }

    async findById(id: string) {
        return prisma.booking.findUnique({
            where: { id },
            include: {
                passenger: { select: safePassengerSelect },
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
                passenger: { select: safePassengerSelect },
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
