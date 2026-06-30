import { prisma, Prisma } from "@buzo/db";

export class UserRepository {
    async findById(id: string) {
        return prisma.user.findUnique({
            where: { id },
        });
    }

    async findByEmail(email: string) {
        return prisma.user.findUnique({
            where: { email },
        });
    }

    async findAll() {
        return prisma.user.findMany({
            orderBy: {
                createdAt: "desc",
            },
        });
    }

    async create(data: Prisma.UserCreateInput) {
        return prisma.user.create({
            data,
        });
    }
}

export const userRepository = new UserRepository();