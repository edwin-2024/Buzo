import { Server, Socket } from "socket.io";

export interface BusDelayEvent {
    busId: string;
    tripId?: string;
    delayMinutes: number;
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

        socket.on("busLocationUpdate", (data: any) => {
            // Broadcast to everyone (or specific rooms if needed)
            io.emit("bus-location-update", {
                busId: data.busId,
                location: {
                    lat: data.latitude,
                    lng: data.longitude
                }
            });
        });

        socket.on("bus:delay", (data: { busId: string; tripId?: string; delayMinutes: number; reason?: string }) => {
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

        socket.on("disconnect", () => {
            console.log(`❌ ${socket.id} disconnected`);
        });
    });
}
