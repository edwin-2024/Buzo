import { Server, Socket } from "socket.io";
import { busLocationService } from "../services/bus-location.service";
import { driverRepository } from "../repositories/driver.repository";

export interface BusDelayEvent {
    busId: string;
    tripId?: string;
    delayMinutes: number;
    reason?: string;
    timestamp: string;
}

export interface BusBreakEvent {
    busId: string;
    tripId?: string;
    onBreak: boolean;
    reason?: string;
    timestamp: string;
}

export function registerBusSocket(io: Server) {
    io.on("connection", (socket: Socket) => {
        console.log(`🔌 ${socket.id} connected`);

        socket.on("bus:join", (busId: string) => {
            socket.join(busId);

            console.log(`${socket.id} joined ${busId}`);
        });

        socket.on("bus:leave", (busId: string) => {
            socket.leave(busId);

            console.log(`${socket.id} left ${busId}`);
        });

        socket.on("trip:join", (tripId: string) => {
            if (typeof tripId === "string" && tripId.trim()) {
                socket.join(`trip:${tripId}`);
            }
        });

        socket.on("trip:leave", (tripId: string) => {
            if (typeof tripId === "string" && tripId.trim()) {
                socket.leave(`trip:${tripId}`);
            }
        });

        socket.on("busLocationUpdate", async (data: any) => {
            // Guard: Passengers cannot broadcast bus telemetry
            if (socket.data?.user && socket.data.user.role === "PASSENGER") {
                return;
            }

            if (
                !data ||
                typeof data.busId !== "string" ||
                typeof data.latitude !== "number" ||
                typeof data.longitude !== "number" ||
                isNaN(data.latitude) ||
                isNaN(data.longitude)
            ) {
                return;
            }

            // Driver authorization check: verify driver assignment (cached in socket session to eliminate 1Hz DB queries)
            if (socket.data?.user && socket.data.user.role === "DRIVER") {
                let assignedBusId = socket.data.assignedBusId;
                if (assignedBusId === undefined) {
                    const driver = await driverRepository.findByUserId(socket.data.user.userId);
                    assignedBusId = driver?.assignedBusId ?? null;
                    socket.data.assignedBusId = assignedBusId;
                }
                if (!assignedBusId || assignedBusId !== data.busId) {
                    return;
                }
            }

            const heading = typeof data.heading === "number" ? data.heading : 0;
            const speed = typeof data.speed === "number" ? data.speed : 0;

            try {
                await busLocationService.updateLocation(
                    data.busId,
                    data.latitude,
                    data.longitude,
                    heading,
                    speed,
                    { forcePersist: Boolean(data.forcePersist) }
                );
            } catch (err) {
                console.error("Error updating bus location via socket:", err);
            }
        });

        socket.on("bus:delay", (data: { busId: string; tripId?: string; delayMinutes: number; reason?: string }) => {
            // Guard: Passengers cannot report delays
            if (socket.data?.user && socket.data.user.role === "PASSENGER") {
                return;
            }

            if (!data || !data.busId || typeof data.delayMinutes !== "number" || data.delayMinutes < 0) {
                return;
            }
            const payload: BusDelayEvent = {
                busId: data.busId,
                tripId: data.tripId,
                delayMinutes: Math.floor(data.delayMinutes),
                reason: data.reason || "Traffic delay",
                timestamp: new Date().toISOString()
            };
            io.to(data.busId).emit("bus:delay", payload);
            console.log(`⏱️ Delay reported for bus ${data.busId}: +${payload.delayMinutes} mins (${payload.reason})`);
        });

        socket.on("bus:break", (data: { busId: string; tripId?: string; onBreak: boolean; reason?: string }) => {
            // Guard: Passengers cannot trigger driver break status
            if (socket.data?.user && socket.data.user.role === "PASSENGER") {
                return;
            }

            if (!data || !data.busId || typeof data.busId !== "string" || typeof data.onBreak !== "boolean") {
                return;
            }
            const payload: BusBreakEvent = {
                busId: data.busId,
                tripId: data.tripId,
                onBreak: data.onBreak,
                reason: data.reason,
                timestamp: new Date().toISOString()
            };
            io.to(data.busId).emit("bus:break", payload);
            console.log(`☕ Bus ${data.busId} break status: ${payload.onBreak ? "ON_BREAK" : "RESUMED"}`);
        });

        socket.on("disconnect", () => {
            console.log(`❌ ${socket.id} disconnected`);
        });
    });
}
