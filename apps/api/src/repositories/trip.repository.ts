import { prisma, Prisma } from "@buzo/db";

export class TripRepository {
    async findAll() {
        return prisma.trip.findMany({
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
                seats: {
                    select: {
                        id: true,
                        seatNumber: true,
                        status: true,
                    },
                },
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
                route: {
                    include: {
                        stops: {
                            include: { stop: true },
                            orderBy: { order: "asc" }
                        }
                    }
                }
            },
        });
    }

    buildSearchWhere(
        origin?: string,
        destination?: string,
        date?: string
    ): Prisma.TripWhereInput {
        const whereClause: Prisma.TripWhereInput = {};

        if (date) {
            const dateStr = date.includes("T") ? date.split("T")[0] : date;
            const startOfDay = new Date(`${dateStr}T00:00:00.000Z`);
            const endOfDay = new Date(`${dateStr}T23:59:59.999Z`);
            if (!isNaN(startOfDay.getTime()) && !isNaN(endOfDay.getTime())) {
                whereClause.departureTime = {
                    gte: startOfDay,
                    lte: endOfDay,
                };
            }
        }

        const andConditions: Prisma.TripWhereInput[] = [];

        if (origin && origin.trim()) {
            andConditions.push({
                route: {
                    stops: {
                        some: {
                            stop: {
                                name: {
                                    contains: origin.trim(),
                                    mode: "insensitive",
                                },
                            },
                        },
                    },
                },
            });
        }

        if (destination && destination.trim()) {
            andConditions.push({
                route: {
                    stops: {
                        some: {
                            stop: {
                                name: {
                                    contains: destination.trim(),
                                    mode: "insensitive",
                                },
                            },
                        },
                    },
                },
            });
        }

        if (andConditions.length > 0) {
            whereClause.AND = andConditions;
        }

        return whereClause;
    }

    async searchTrips(
        origin?: string,
        destination?: string,
        date?: string
    ) {
        const where = this.buildSearchWhere(origin, destination, date);

        return prisma.trip.findMany({
            where,
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

    async findDriverByUserId(userId: string) {
        return prisma.driver.findUnique({
            where: { userId }
        });
    }

    async findTripsByBusId(busId: string) {
        return prisma.trip.findMany({
            where: {
                busId,
                status: {
                    in: ["SCHEDULED", "BOARDING", "IN_PROGRESS"]
                }
            },
            include: {
                route: {
                    include: {
                        stops: {
                            include: { stop: true },
                            orderBy: { order: "asc" }
                        }
                    }
                }
            },
            orderBy: { departureTime: "asc" }
        });
    }
}

export const tripRepository = new TripRepository();