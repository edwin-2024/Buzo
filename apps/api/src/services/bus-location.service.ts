import { getIO } from "../realtime/socket";
import { busRepository } from "../repositories/bus.repository";
import { busLocationRepository } from "../repositories/bus-location.repository";

export class BusLocationService {
    async updateLocation(
        busId: string,
        latitude: number,
        longitude: number,
        heading: number,
        speed: number
    ) {
        const bus = await busRepository.findById(busId);

        if (!bus) {
            throw new Error("Bus not found");
        }

        const location =
            await busLocationRepository.upsert(
                busId,
                latitude,
                longitude,
                heading,
                speed
            );

        getIO().to(busId).emit("bus:location", location);

        return location;
    }

    async getLocation(busId: string) {
        return busLocationRepository.find(busId);
    }
}

export const busLocationService =
    new BusLocationService();