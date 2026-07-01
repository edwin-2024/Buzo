import { busRepository } from "../../repositories/bus.repository";
import { busLocationService } from "../../services/bus-location.service";

import type { ToolHandler } from "./types";

export const trackBusHandler: ToolHandler = async (args) => {
    const busNumber = args.busNumber as string;

    const bus = await busRepository.findByNumber(busNumber);

    if (!bus) {
        throw new Error("Bus not found");
    }

    return busLocationService.getLocation(bus.id);
};