import { tripService } from "../../services/trip.service";

import type { ToolHandler } from "./types";

export const searchTripsHandler: ToolHandler = async (
    args
) => {
    return tripService.searchTrips(
        args.origin as string,
        args.destination as string
    );
};