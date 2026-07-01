import { prisma } from "./client";
import "dotenv/config";

import {
    UserRole,
    TripStatus,
    SeatStatus,
} from "../generated/prisma/client";

async function main() {
    console.log("🌱 Seeding database...");


    await prisma.booking.deleteMany();
    await prisma.seat.deleteMany();
    await prisma.trip.deleteMany();
    await prisma.routeStop.deleteMany();
    await prisma.route.deleteMany();
    await prisma.stop.deleteMany();
    await prisma.busLocation.deleteMany();
    await prisma.bus.deleteMany();
    await prisma.driver.deleteMany();
    await prisma.user.deleteMany();



    const admin = await prisma.user.create({
        data: {
            name: "Admin",
            email: "admin@buzo.com",
            password: "password",
            role: UserRole.ADMIN,
        },
    });

    const driverUser = await prisma.user.create({
        data: {
            name: "Ravi Kumar",
            email: "driver1@buzo.com",
            password: "password",
            role: UserRole.DRIVER,
        },
    });


    const buses = [];

    for (let i = 1; i <= 5; i++) {
        const bus = await prisma.bus.create({
            data: {
                number: `KA-01-BZ-10${i}`,
                capacity: 40,
            },
        });

        buses.push(bus);
    }


    await prisma.driver.create({
        data: {
            userId: driverUser.id,
            assignedBusId: buses[0].id,
        },
    });



    const stopNames = [
        "Majestic",
        "MG Road",
        "Indiranagar",
        "Baiyappanahalli",
        "KR Puram",
        "Marathahalli",
        "Bellandur",
        "Silk Board",
        "Electronic City",
        "Bommasandra",
        "Whitefield-metro",
        "Hopefarm",
        "Kadugodi",
    ];

    const stops = [];

    for (let i = 0; i < stopNames.length; i++) {
        const stop = await prisma.stop.create({
            data: {
                name: stopNames[i],
                latitude: 12.90 + i * 0.01,
                longitude: 77.55 + i * 0.01,
            },
        });

        stops.push(stop);
    }


    const route1 = await prisma.route.create({
        data: {
            name: "City Route",
        },
    });

    const route2 = await prisma.route.create({
        data: {
            name: "Tech Park Route",
        },
    });

    const route3 = await prisma.route.create({
        data: {
            name: "Majestic-Whitefield Express",
        },
    });

    for (let i = 0; i < 5; i++) {
        await prisma.routeStop.create({
            data: {
                routeId: route1.id,
                stopId: stops[i].id,
                order: i + 1,
                distanceFromStart: i * 5,
            },
        });
    }

    for (let i = 5; i < 10; i++) {
        await prisma.routeStop.create({
            data: {
                routeId: route2.id,
                stopId: stops[i].id,
                order: i - 4,
                distanceFromStart: (i - 5) * 6,
            },
        });
    }

    // Route 3: Majestic → Baiyappanahalli → KR Puram → Whitefield-metro → Hopefarm → Kadugodi
    const route3Stops = [0, 3, 4, 10, 11, 12]; // indices into stops[]
    for (let i = 0; i < route3Stops.length; i++) {
        await prisma.routeStop.create({
            data: {
                routeId: route3.id,
                stopId: stops[route3Stops[i]].id,
                order: i + 1,
                distanceFromStart: i * 7,
            },
        });
    }


    const trip1 = await prisma.trip.create({
        data: {
            busId: buses[0].id,
            routeId: route1.id,
            departureTime: new Date("2026-07-01T08:00:00"),
            arrivalTime: new Date("2026-07-01T09:00:00"),
            status: TripStatus.SCHEDULED,
        },
    });

    const trip2 = await prisma.trip.create({
        data: {
            busId: buses[1].id,
            routeId: route2.id,
            departureTime: new Date("2026-07-01T09:30:00"),
            arrivalTime: new Date("2026-07-01T10:45:00"),
            status: TripStatus.SCHEDULED,
        },
    });

    const trip3 = await prisma.trip.create({
        data: {
            busId: buses[2].id,
            routeId: route3.id,
            departureTime: new Date("2026-07-01T07:00:00"),
            arrivalTime: new Date("2026-07-01T08:30:00"),
            status: TripStatus.SCHEDULED,
        },
    });



    for (const trip of [trip1, trip2, trip3]) {
        for (let i = 1; i <= 40; i++) {
            await prisma.seat.create({
                data: {
                    tripId: trip.id,
                    seatNumber: i,
                    status: SeatStatus.AVAILABLE,
                },
            });
        }
    }

    console.log("✅ Database seeded!");
    console.log(`Admin: ${admin.email}`);
}

main()
    .catch((err) => {
        console.error(err);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });