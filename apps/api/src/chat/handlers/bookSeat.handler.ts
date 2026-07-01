import { bookingService } from "../../services/booking.service";

import type { ToolHandler } from "./types";

export const bookSeatHandler: ToolHandler = async (
    args,
    userId
) => {
    if (!userId) {
        throw new Error("Authentication required");
    }

    return bookingService.create(userId, {
        tripId: args.tripId as string,
        seatId: args.seatId as string,
    });
};