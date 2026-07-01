import { seatRepository } from "../../repositories/seat.repository";

import type { ToolHandler } from "./types";

export const checkSeatsHandler: ToolHandler = async (args) => {
    const tripId = args.tripId as string;

    return seatRepository.findByTripId(tripId);
};