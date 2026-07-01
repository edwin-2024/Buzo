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