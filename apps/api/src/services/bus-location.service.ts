import { getIO } from "../realtime/socket";
import { busRepository } from "../repositories/bus.repository";
import { busLocationRepository } from "../repositories/bus-location.repository";

export interface UpdateLocationOptions {
    forcePersist?: boolean;
}

export interface BusTelemetryPayload {
    busId: string;
    latitude: number;
    longitude: number;
    heading: number;
    speed: number;
    updatedAt: Date;
    bus?: {
        id?: string;
        number?: string;
        capacity?: number;
    };
}

export class BusLocationService {
    private readonly dbPersistThrottleMs: number;
    private lastDbPersistTime = new Map<string, number>();
    private latestLocations = new Map<string, BusTelemetryPayload>();
    private busNumberCache = new Map<string, { number: string; cachedAt: number }>();
    private static readonly BUS_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

    constructor(dbPersistThrottleMs: number = 30_000) {
        this.dbPersistThrottleMs = dbPersistThrottleMs;
    }

    private async getBusNumber(busId: string): Promise<string> {
        const cached = this.busNumberCache.get(busId);
        const now = Date.now();
        if (cached && now - cached.cachedAt < BusLocationService.BUS_CACHE_TTL_MS) {
            return cached.number;
        }

        const bus = await busRepository.findById(busId);
        if (!bus) {
            throw new Error("Bus not found");
        }

        this.busNumberCache.set(busId, { number: bus.number, cachedAt: now });
        return bus.number;
    }

    async updateLocation(
        busId: string,
        latitude: number,
        longitude: number,
        heading: number,
        speed: number,
        options?: UpdateLocationOptions
    ): Promise<BusTelemetryPayload> {
        const busNumber = await this.getBusNumber(busId);
        const now = Date.now();

        const locationPayload: BusTelemetryPayload = {
            busId,
            latitude,
            longitude,
            heading,
            speed,
            updatedAt: new Date(now),
            bus: {
                number: busNumber,
            },
        };

        this.latestLocations.set(busId, locationPayload);

        // Immediate real-time WebSocket broadcast (sub-millisecond latency for live tracking)
        const io = getIO();
        io.to(busId).emit("bus:location", locationPayload);
        io.emit("bus-location-update", {
            busId,
            location: {
                lat: latitude,
                lng: longitude,
            },
            heading,
            speed,
            bus: {
                number: busNumber,
            },
            lastUpdated: locationPayload.updatedAt,
        });

        // Throttle Postgres DB upsert to eliminate 1Hz write amplification
        const lastPersist = this.lastDbPersistTime.get(busId) || 0;
        const shouldPersist = options?.forcePersist || (now - lastPersist >= this.dbPersistThrottleMs);

        if (shouldPersist) {
            const persisted = await busLocationRepository.upsert(
                busId,
                latitude,
                longitude,
                heading,
                speed
            );
            this.lastDbPersistTime.set(busId, now);
            return persisted as BusTelemetryPayload;
        }

        return locationPayload;
    }

    async getLocation(busId: string) {
        const inMemory = this.latestLocations.get(busId);
        if (inMemory) {
            return inMemory;
        }
        return busLocationRepository.find(busId);
    }

    async getAllLocations() {
        const dbLocations = await busLocationRepository.findAll();
        const merged = new Map<string, any>();
        for (const loc of dbLocations) {
            merged.set(loc.busId, loc);
        }
        for (const [busId, loc] of this.latestLocations.entries()) {
            const existing = merged.get(busId);
            merged.set(busId, { ...existing, ...loc });
        }
        return Array.from(merged.values());
    }

    async flushPendingLocations(): Promise<number> {
        let flushed = 0;
        for (const [busId, loc] of this.latestLocations.entries()) {
            await busLocationRepository.upsert(
                busId,
                loc.latitude,
                loc.longitude,
                loc.heading,
                loc.speed
            );
            this.lastDbPersistTime.set(busId, Date.now());
            flushed++;
        }
        return flushed;
    }

    resetThrottleState(): void {
        this.lastDbPersistTime.clear();
        this.latestLocations.clear();
        this.busNumberCache.clear();
    }
}

export const busLocationService = new BusLocationService();
