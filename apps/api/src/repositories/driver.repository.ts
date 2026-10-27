import { prisma, Prisma } from "@buzo/db";

const safeUserSelect = {
    id: true,
    name: true,
    email: true,
    role: true,
    createdAt: true,
    updatedAt: true,
};

export class DriverRepository {
    async findAll() {
        return prisma.driver.findMany({
            include: {
                user: { select: safeUserSelect },
                assignedBus: true,
            },
        });
    }

    async findById(id: string) {
        return prisma.driver.findUnique({
            where: { id },
            include: {
                user: { select: safeUserSelect },
                assignedBus: true,
            },
        });
    }

    async findByUserId(userId: string) {
        return prisma.driver.findUnique({
            where: { userId },
        });
    }

    async findByAssignedBusId(busId: string) {
        return prisma.driver.findFirst({
            where: {
                assignedBusId: busId,
            },
        });
    }

    async create(data: Prisma.DriverCreateInput) {
        return prisma.driver.create({
            data,
            include: {
                user: { select: safeUserSelect },
                assignedBus: true,
            },
        });
    }

    async assignBus(id: string, busId: string) {
        return prisma.driver.update({
            where: { id },
            data: {
                assignedBus: {
                    connect: {
                        id: busId,
                    },
                },
            },
            include: {
                user: { select: safeUserSelect },
                assignedBus: true,
            },
        });
    }

    async delete(id: string) {
        return prisma.driver.delete({
            where: { id },
        });
    }
}

export const driverRepository = new DriverRepository();