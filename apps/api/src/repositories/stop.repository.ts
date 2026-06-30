import { prisma, Prisma } from "@buzo/db";

export class StopRepository {
    async findAll() {
        return prisma.stop.findMany({
            orderBy: {
                name: "asc",
            },
        });
    }

    async findById(id: string) {
        return prisma.stop.findUnique({
            where: {
                id,
            },
        });
    }

    async findByName(name: string) {
        return prisma.stop.findFirst({
            where: {
                name: {
                    equals: name,
                    mode: "insensitive",
                },
            },
        });
    }

    async create(data: Prisma.StopCreateInput) {
        return prisma.stop.create({
            data,
        });
    }

    async update(
        id: string,
        data: Prisma.StopUpdateInput
    ) {
        return prisma.stop.update({
            where: {
                id,
            },
            data,
        });
    }

    async delete(id: string) {
        return prisma.stop.delete({
            where: {
                id,
            },
        });
    }
}

export const stopRepository = new StopRepository();