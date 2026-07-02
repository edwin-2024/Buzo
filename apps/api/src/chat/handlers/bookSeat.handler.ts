import { tripService } from "../../services/trip.service";
import { seatRepository } from "../../repositories/seat.repository";
import { bookingService } from "../../services/booking.service";

import type { ToolHandler } from "./types";

export const bookSeatHandler: ToolHandler = async (args, userId) => {
    if (!userId) {
        throw new Error("Authentication required. Please log in to book seats.");
    }

    const origin = args.origin as string;
    const destination = args.destination as string;
    const numberOfSeats = (args.numberOfSeats as number) || 1;
    const position = args.position as string | undefined;
    const sideBySide = args.sideBySide as boolean | undefined;

    const trips = await tripService.searchTrips(origin, destination);
    if (trips.length === 0) {
        return { error: `No trips found from ${origin} to ${destination}.` };
    }

    const trip = trips[0];
    const seats = await seatRepository.findByTripId(trip.id);
    let availableSeats = seats.filter((s) => s.status === "AVAILABLE");

    if (availableSeats.length < numberOfSeats) {
        return { error: `Not enough available seats. Only ${availableSeats.length} left.` };
    }

    // Sort by seat number numerically (assuming format like "1", "2", "3" or similar)
    availableSeats.sort((a, b) => parseInt(a.seatNumber) - parseInt(b.seatNumber));

    // Position Filtering
    if (position) {
        const pos = position.toLowerCase();
        const total = trip.bus.capacity;
        
        availableSeats = availableSeats.filter(s => {
            const num = parseInt(s.seatNumber);
            if (isNaN(num)) return true; // Fallback if seats are named like A1, A2

            if (pos.includes("front")) return num <= Math.floor(total / 3);
            if (pos.includes("middle")) return num > Math.floor(total / 3) && num <= Math.floor((total / 3) * 2);
            if (pos.includes("back")) return num > Math.floor((total / 3) * 2);
            return true;
        });
    }

    if (availableSeats.length < numberOfSeats) {
        return { error: `Not enough seats available in the requested position (${position}).` };
    }

    let selectedSeats = [];

    // Side-by-Side Logic (Consecutive seat numbers)
    if (sideBySide && numberOfSeats > 1) {
        let found = false;
        for (let i = 0; i <= availableSeats.length - numberOfSeats; i++) {
            const slice = availableSeats.slice(i, i + numberOfSeats);
            
            // Check if all seats in the slice are consecutive
            let isConsecutive = true;
            for (let j = 1; j < slice.length; j++) {
                const prev = parseInt(slice[j - 1].seatNumber);
                const curr = parseInt(slice[j].seatNumber);
                if (isNaN(prev) || isNaN(curr) || curr !== prev + 1) {
                    isConsecutive = false;
                    break;
                }
            }

            if (isConsecutive) {
                selectedSeats = slice;
                found = true;
                break;
            }
        }

        if (!found) {
            return { error: `Could not find ${numberOfSeats} adjacent seats side-by-side in this section.` };
        }
    } else {
        // Just pick the first N available seats
        selectedSeats = availableSeats.slice(0, numberOfSeats);
    }

    // Book the seats
    const bookedIds = [];
    for (const seat of selectedSeats) {
        await bookingService.create(userId, {
            tripId: trip.id,
            seatId: seat.id,
        });
        bookedIds.push(seat.seatNumber);
    }

    return {
        message: "Booking successful!",
        tripId: trip.id,
        route: trip.route.name,
        bus: trip.bus.number,
        seatsBooked: bookedIds,
    };
};