import { prisma, Prisma } from "@buzo/db";

export class TripRepository {
    async findAll() {
        return prisma.trip.findMany({
            include: {
                bus: true,
                route: true,
            },
            orderBy: {
                departureTime: "asc",
            },
        });
    }

    async findById(id: string) {
        return prisma.trip.findUnique({
            where: { id },
            include: {
                bus: true,
                route: true,
            },
        });
    }

    async searchTrips(
        origin: string,
        destination: string
    ) {
        return prisma.trip.findMany({
            where: {
                AND: [
                    {
                        route: {
                            stops: {
                                some: {
                                    stop: {
                                        name: {
                                            equals: origin,
                                            mode: "insensitive",
                                        },
                                    },
                                },
                            },
                        },
                    },
                    {
                        route: {
                            stops: {
                                some: {
                                    stop: {
                                        name: {
                                            equals: destination,
                                            mode: "insensitive",
                                        },
                                    },
                                },
                            },
                        },
                    },
                ],
            },

            include: {
                bus: true,

                route: {
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
                },
            },

            orderBy: {
                departureTime: "asc",
            },
        });
    }

    async create(data: Prisma.TripCreateInput) {
        return prisma.trip.create({
            data,
            include: {
                bus: true,
                route: true,
            },
        });
    }

    async update(
        id: string,
        data: Prisma.TripUpdateInput
    ) {
        return prisma.trip.update({
            where: { id },
            data,
            include: {
                bus: true,
                route: true,
            },
        });
    }

    async delete(id: string) {
        return prisma.trip.delete({
            where: { id },
        });
    }
}

export const tripRepository = new TripRepository();