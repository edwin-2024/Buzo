import { tripService } from "../../services/trip.service";
import { seatRepository } from "../../repositories/seat.repository";

import type { ToolHandler } from "./types";

export const checkSeatsHandler: ToolHandler = async (args) => {
    const origin = args.origin as string;
    const destination = args.destination as string;

    const trips = await tripService.searchTrips(origin, destination);

    if (!trips.length || !trips[0]) {
        return { message: "No trips found for this route." };
    }

    // Default to the first available trip for the requested route
    const trip = trips[0];
    const seats = await seatRepository.findByTripId(trip.id);

    const availableSeats = seats.filter((s) => s.status === "AVAILABLE");

    return {
        tripId: trip.id,
        route: trip.route.name,
        bus: trip.bus.number,
        totalSeats: trip.bus.capacity,
        availableSeatsCount: availableSeats.length,
        availableSeatNumbers: availableSeats.map((s) => s.seatNumber),
    };
};