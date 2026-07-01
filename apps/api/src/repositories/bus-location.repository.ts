import { prisma } from "@buzo/db";

export class BusLocationRepository {
    async upsert(
        busId: string,
        latitude: number,
        longitude: number,
        heading: number,
        speed: number
    ) {
        return prisma.busLocation.upsert({
            where: {
                busId,
            },
            update: {
                latitude,
                longitude,
                heading,
                speed,
            },
            create: {
                bus: {
                    connect: {
                        id: busId,
                    },
                },
                latitude,
                longitude,
                heading,
                speed,
            },
        });
    }

    async find(busId: string) {
        return prisma.busLocation.findUnique({
            where: {
                busId,
            },
        });
    }
}

export const busLocationRepository =
    new BusLocationRepository();