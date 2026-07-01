import type { ToolHandler } from "./types";

import { searchTripsHandler } from "./searchTrips.handler";
import { trackBusHandler } from "./trackBus.handler";
import { checkSeatsHandler } from "./checkSeats.handler";
import { bookSeatHandler } from "./bookSeat.handler";

export const toolHandlers: Record<string, ToolHandler> = {
    searchTrips: searchTripsHandler,
    trackBus: trackBusHandler,
    checkSeats: checkSeatsHandler,
    bookSeat: bookSeatHandler,
};