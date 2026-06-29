import { prisma } from "@repo/db";

export class BusRepository {
    async findAll() {
        return prisma.bus.findMany({
            include: {
                driver: true,
            },
        });
    }

    async findById(id: string) {
        return prisma.bus.findUnique({
            where: { id },
            include: {
                driver: true,
            },
        });
    }

    async create(number: string, capacity: number) {
        return prisma.bus.create({
            data: {
                number,
                capacity,
            },
        });
    }
}

export const busRepository = new BusRepository();