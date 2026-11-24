import { Server, Socket } from "socket.io";
import { type SeatStatus } from "@buzo/db";
import { registerBusSocket } from "./bus.socket";
import { verifyToken } from "../lib/jwt";
import { tokenRevocationService } from "../services/token-revocation.service";

let io: Server;

export function socketAuthMiddleware(socket: Socket, next: (err?: Error) => void) {
    try {
        const rawAuth =
            socket.handshake.auth?.token ||
            socket.handshake.headers?.authorization;

        if (!rawAuth || typeof rawAuth !== "string") {
            // Anonymous guest connection permitted for public telemetry & seat observation
            return next();
        }

        const token = rawAuth.replace(/^Bearer\s+/i, "").trim();
        if (!token) {
            return next();
        }

        const payload = verifyToken(token);
        if (tokenRevocationService.isRevoked(token, payload)) {
            return next(new Error("Authentication error: Token revoked"));
        }

        socket.data.user = payload;
        socket.data.token = token;
        return next();
    } catch {
        // Explicit token was provided but failed verification
        return next(new Error("Authentication error: Invalid or expired token"));
    }
}

export function initializeSocket(server: any) {
    io = new Server(server, {
        cors: {
            origin: "*",
        },
    });

    // Enforce JWT authentication and revocation checks during socket handshake
    io.use(socketAuthMiddleware);

    registerBusSocket(io);

    return io;
}

export function getIO() {
    if (!io) {
        throw new Error("Socket.IO not initialized");
    }

    return io;
}

export function broadcastSeatUpdate(tripId: string, seatIds: string[], status: SeatStatus | string) {
    try {
        if (!io) return;
        const payload = { tripId, seatIds, status, timestamp: new Date().toISOString() };
        io.to(`trip:${tripId}`).emit("seats:updated", payload);
        io.emit("seats:updated", payload);
    } catch {
        // Socket.IO not initialized (e.g. during standalone test execution)
    }
}
