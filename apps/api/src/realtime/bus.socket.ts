import { Server, Socket } from "socket.io";

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

        socket.on("disconnect", () => {
            console.log(`❌ ${socket.id} disconnected`);
        });
    });
}