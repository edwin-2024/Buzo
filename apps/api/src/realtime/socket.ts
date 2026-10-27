import { Server } from "socket.io";
import { registerBusSocket } from "./bus.socket";

let io: Server;

export function initializeSocket(server: any) {
    io = new Server(server, {
        cors: {
            origin: "*",
        },
    });

    registerBusSocket(io);

    return io;
}

export function getIO() {
    if (!io) {
        throw new Error("Socket.IO not initialized");
    }

    return io;
}

export function broadcastSeatUpdate(tripId: string, seatIds: string[], status: string) {
    try {
        if (!io) return;
        const payload = { tripId, seatIds, status, timestamp: new Date().toISOString() };
        io.to(`trip:${tripId}`).emit("seats:updated", payload);
        io.emit("seats:updated", payload);
    } catch {
        // Socket.IO not initialized (e.g. during standalone test execution)
    }
}
