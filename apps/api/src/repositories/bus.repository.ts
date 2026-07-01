import { prisma, Prisma } from "@buzo/db";

export class BusRepository {
    async findAll() {
        return prisma.bus.findMany({
            orderBy: {
                number: "asc",
            },
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

    async findByNumber(number: string) {
        return prisma.bus.findFirst({
            where: {
                number: {
                    equals: number,
                    mode: "insensitive",
                },
            },
        });
    }

    async create(data: Prisma.BusCreateInput) {
        return prisma.bus.create({
            data,
        });
    }

    async update(id: string, data: Prisma.BusUpdateInput) {
        return prisma.bus.update({
            where: { id },
            data,
        });
    }

    async delete(id: string) {
        return prisma.bus.delete({
            where: { id },
        });
    }
}

export const busRepository = new BusRepository();