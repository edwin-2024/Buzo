import { prisma } from "@repo/db";

export class TripRepository {
    async findAll() {
        return prisma.trip.findMany({
            include: {
                bus: true,
                route: true,
            },
        });
    }

    async findById(id: string) {
        return prisma.trip.findUnique({
            where: { id },
            include: {
                bus: true,
                route: true,
                seats: true,
            },
        });
    }
}

export const tripRepository = new TripRepository();