import { describe, it, expect, beforeEach, afterEach, spyOn } from "bun:test";
import { createServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import { io as Client, Socket as ClientSocket } from "socket.io-client";
import { initializeSocket, socketAuthMiddleware } from "../src/realtime/socket";
import { registerBusSocket } from "../src/realtime/bus.socket";
import { signToken } from "../src/lib/jwt";
import { tokenRevocationService } from "../src/services/token-revocation.service";
import { driverRepository } from "../src/repositories/driver.repository";
import { busLocationService } from "../src/services/bus-location.service";

describe("Socket.io Authentication & Authorization Suite", () => {
    let io: SocketIOServer;
    let server: any;
    let serverPort: number;
    let clientSockets: ClientSocket[] = [];

    const createClient = (token?: string, extraOptions = {}): Promise<ClientSocket> => {
        return new Promise((resolve, reject) => {
            const socket = Client(`http://localhost:${serverPort}`, {
                auth: token ? { token } : undefined,
                reconnection: false,
                timeout: 2000,
                ...extraOptions,
            });

            socket.on("connect", () => {
                clientSockets.push(socket);
                resolve(socket);
            });

            socket.on("connect_error", (err) => {
                clientSockets.push(socket);
                reject(err);
            });
        });
    };

    beforeEach((done) => {
        tokenRevocationService.clearForTesting();
        server = createServer();
        io = initializeSocket(server);

        server.listen(() => {
            serverPort = (server.address() as any).port;
            done();
        });
    });

    afterEach(() => {
        for (const sock of clientSockets) {
            try {
                sock.disconnect();
                sock.close();
            } catch {}
        }
        clientSockets = [];
        io.close();
        server.close();
    });

    describe("Handshake Authentication Middleware", () => {
        it("should allow anonymous guest connection without token", async () => {
            const socket = await createClient();
            expect(socket.connected).toBe(true);
        });

        it("should accept valid DRIVER token and authenticate session", async () => {
            const token = signToken({ userId: "driver-u1", role: "DRIVER" });
            const socket = await createClient(token);
            expect(socket.connected).toBe(true);
        });

        it("should accept valid PASSENGER token and authenticate session", async () => {
            const token = signToken({ userId: "passenger-u1", role: "PASSENGER" });
            const socket = await createClient(token);
            expect(socket.connected).toBe(true);
        });

        it("should reject connection when explicit token is invalid/malformed", async () => {
            let errorReceived: Error | null = null;
            try {
                await createClient("invalid.malformed.jwt.token");
            } catch (err: any) {
                errorReceived = err;
            }

            expect(errorReceived).toBeDefined();
            expect(errorReceived?.message).toContain("Authentication error");
        });

        it("should reject connection when token has been revoked in tokenRevocationService", async () => {
            const token = signToken({ userId: "driver-revoked", role: "DRIVER" });
            tokenRevocationService.revokeToken(token);

            let errorReceived: Error | null = null;
            try {
                await createClient(token);
            } catch (err: any) {
                errorReceived = err;
            }

            expect(errorReceived).toBeDefined();
            expect(errorReceived?.message).toContain("revoked");
        });
    });

    describe("Role-Based Telemetry & Broadcast Guards", () => {
        it("should block PASSENGER role from broadcasting bus telemetry", async () => {
            const token = signToken({ userId: "passenger-malicious", role: "PASSENGER" });
            const socket = await createClient(token);

            const updateSpy = spyOn(busLocationService, "updateLocation").mockResolvedValue({} as any);

            socket.emit("busLocationUpdate", {
                busId: "bus-101",
                latitude: 12.9716,
                longitude: 77.5946,
            });

            await new Promise((r) => setTimeout(r, 80));
            expect(updateSpy).not.toHaveBeenCalled();
            updateSpy.mockRestore();
        });

        it("should block DRIVER from broadcasting telemetry for an unassigned bus", async () => {
            const token = signToken({ userId: "driver-assigned-bus1", role: "DRIVER" });
            const socket = await createClient(token);

            const driverSpy = spyOn(driverRepository, "findByUserId").mockResolvedValue({
                id: "d1",
                userId: "driver-assigned-bus1",
                assignedBusId: "bus-1",
            } as any);

            const updateSpy = spyOn(busLocationService, "updateLocation").mockResolvedValue({} as any);

            // Attempt to emit for bus-2 while assigned to bus-1
            socket.emit("busLocationUpdate", {
                busId: "bus-2",
                latitude: 12.9716,
                longitude: 77.5946,
            });

            await new Promise((r) => setTimeout(r, 80));
            expect(updateSpy).not.toHaveBeenCalled();

            driverSpy.mockRestore();
            updateSpy.mockRestore();
        });

        it("should allow DRIVER to broadcast telemetry for their assigned bus", async () => {
            const token = signToken({ userId: "driver-assigned-bus1", role: "DRIVER" });
            const socket = await createClient(token);

            const driverSpy = spyOn(driverRepository, "findByUserId").mockResolvedValue({
                id: "d1",
                userId: "driver-assigned-bus1",
                assignedBusId: "bus-1",
            } as any);

            const updateSpy = spyOn(busLocationService, "updateLocation").mockResolvedValue({} as any);

            socket.emit("busLocationUpdate", {
                busId: "bus-1",
                latitude: 12.9716,
                longitude: 77.5946,
                heading: 45,
                speed: 60,
            });

            await new Promise((r) => setTimeout(r, 80));
            expect(updateSpy).toHaveBeenCalled();

            driverSpy.mockRestore();
            updateSpy.mockRestore();
        });

        it("should allow ADMIN role to broadcast telemetry for any bus", async () => {
            const token = signToken({ userId: "admin-master", role: "ADMIN" });
            const socket = await createClient(token);

            const updateSpy = spyOn(busLocationService, "updateLocation").mockResolvedValue({} as any);

            socket.emit("busLocationUpdate", {
                busId: "bus-any-target",
                latitude: 13.0827,
                longitude: 80.2707,
                heading: 180,
                speed: 50,
            });

            await new Promise((r) => setTimeout(r, 80));
            expect(updateSpy).toHaveBeenCalled();
            updateSpy.mockRestore();
        });

        it("should block PASSENGER from emitting bus:delay events", async () => {
            const passengerToken = signToken({ userId: "p1", role: "PASSENGER" });
            const socket = await createClient(passengerToken);

            let delayReceived = false;
            socket.emit("bus:join", "bus-test");
            socket.on("bus:delay", () => { delayReceived = true; });

            socket.emit("bus:delay", {
                busId: "bus-test",
                delayMinutes: 30,
                reason: "Unauthorized passenger delay attempt",
            });

            await new Promise((r) => setTimeout(r, 80));
            expect(delayReceived).toBe(false);
        });

        it("should block PASSENGER from emitting bus:break events", async () => {
            const passengerToken = signToken({ userId: "p1", role: "PASSENGER" });
            const socket = await createClient(passengerToken);

            let breakReceived = false;
            socket.emit("bus:join", "bus-test");
            socket.on("bus:break", () => { breakReceived = true; });

            socket.emit("bus:break", {
                busId: "bus-test",
                onBreak: true,
            });

            await new Promise((r) => setTimeout(r, 80));
            expect(breakReceived).toBe(false);
        });
    });
});
