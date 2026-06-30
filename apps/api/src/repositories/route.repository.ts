import { prisma, Prisma } from "@buzo/db";

export class RouteRepository {
    async findAll() {
        return prisma.route.findMany({
            include: {
                stops: {
                    include: {
                        stop: true,
                    },
                    orderBy: {
                        order: "asc",
                    },
                },
            },
            orderBy: {
                name: "asc",
            },
        });
    }

    async findById(id: string) {
        return prisma.route.findUnique({
            where: {
                id,
            },
            include: {
                stops: {
                    include: {
                        stop: true,
                    },
                    orderBy: {
                        order: "asc",
                    },
                },
            },
        });
    }

    async findByName(name: string) {
        return prisma.route.findFirst({
            where: {
                name: {
                    equals: name,
                    mode: "insensitive",
                },
            },
        });
    }


    async create(data: {
        name: string;
        stops: Prisma.RouteStopCreateWithoutRouteInput[];
    }) {
        return prisma.route.create({
            data: {
                name: data.name,
                stops: {
                    create: data.stops,
                },
            },
            include: {
                stops: {
                    include: {
                        stop: true,
                    },
                    orderBy: {
                        order: "asc",
                    },
                },
            },
        });
    }

    async update(id: string, name: string) {
        return prisma.route.update({
            where: {
                id,
            },
            data: {
                name,
            },
        });
    }

    async delete(id: string) {
        return prisma.route.delete({
            where: {
                id,
            },
        });
    }
}

export const routeRepository = new RouteRepository();