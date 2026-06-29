import { prisma } from "@buzo/db";

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

    async create(data: {
        name: string;
        email: string;
        password: string;
        role: "ADMIN" | "DRIVER" | "PASSENGER";
    }) {
        return prisma.user.create({
            data,
        });
    }
}

export const userRepository = new UserRepository();