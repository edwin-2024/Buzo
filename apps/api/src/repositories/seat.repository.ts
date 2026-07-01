import { prisma, Prisma } from "@buzo/db";

export class SeatRepository {
    async createMany(data: Prisma.SeatCreateManyInput[]) {
        return prisma.seat.createMany({
            data,
        });
    }

    async findByTripId(tripId: string) {
        return prisma.seat.findMany({
            where: { tripId },
            orderBy: {
                seatNumber: "asc",
            },
        });
    }

    async findById(id: string) {
        return prisma.seat.findUnique({
            where: { id },
        });
    }

    async updateStatus(id: string, status: Prisma.$Enums.SeatStatus) {
        return prisma.seat.update({
            where: { id },
            data: { status },
        });
    }
}

export const seatRepository = new SeatRepository();