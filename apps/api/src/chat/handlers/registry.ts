import type { ToolHandler } from "./types";

import { searchTripsHandler } from "./searchTrips.handler";
import { trackBusHandler } from "./trackBus.handler";
import { checkSeatsHandler } from "./checkSeats.handler";
import { bookSeatHandler } from "./bookSeat.handler";
import { listRoutesHandler } from "./listRoutes.handler";
import { listStopsHandler } from "./listStops.handler";
import { getDestinationWeatherHandler } from "./getDestinationWeather.handler";
import { getTravelTipsHandler } from "./getTravelTips.handler";

export const toolHandlers: Record<string, ToolHandler> = {
    searchTrips: searchTripsHandler,
    trackBus: trackBusHandler,
    checkSeats: checkSeatsHandler,
    bookSeat: bookSeatHandler,
    listRoutes: listRoutesHandler,
    listStops: listStopsHandler,
    getDestinationWeather: getDestinationWeatherHandler,
    getTravelTips: getTravelTipsHandler,
};