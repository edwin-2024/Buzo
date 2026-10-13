import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { createServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import { io as Client, Socket as ClientSocket } from "socket.io-client";
import { registerBusSocket } from "../src/realtime/bus.socket";

describe("Real-time Bus Delay Notifications (Job: 004-bus-delay-notifications)", () => {
  let io: SocketIOServer;
  let server: any;
  let serverPort: number;
  let clientSocket: ClientSocket;

  beforeEach((done) => {
    server = createServer();
    io = new SocketIOServer(server);
    registerBusSocket(io);

    server.listen(() => {
      serverPort = (server.address() as any).port;
      clientSocket = Client(`http://localhost:${serverPort}`);
      clientSocket.on("connect", done);
    });
  });

  afterEach(() => {
    io.close();
    clientSocket.close();
    server.close();
  });

  it("should broadcast bus:delay to clients joined in the bus room", (done) => {
    const testBusId = "bus-101";

    // Client joins the bus room
    clientSocket.emit("bus:join", testBusId);

    // Listen for the broadcasted delay event
    clientSocket.on("bus:delay", (data: any) => {
      expect(data).toBeDefined();
      expect(data.busId).toBe(testBusId);
      expect(data.delayMinutes).toBe(15);
      expect(data.reason).toBe("Heavy traffic at Silk Board junction");
      expect(typeof data.timestamp).toBe("string");
      done();
    });

    // Another client or driver emits delay report
    setTimeout(() => {
      clientSocket.emit("bus:delay", {
        busId: testBusId,
        delayMinutes: 15,
        reason: "Heavy traffic at Silk Board junction"
      });
    }, 50);
  });

  it("should reject delay events missing busId or with negative delay", (done) => {
    let receivedInvalidEvent = false;

    clientSocket.emit("bus:join", "bus-invalid");

    clientSocket.on("bus:delay", () => {
      receivedInvalidEvent = true;
    });

    // Emit invalid events
    clientSocket.emit("bus:delay", {
      busId: "",
      delayMinutes: 10
    });

    clientSocket.emit("bus:delay", {
      busId: "bus-invalid",
      delayMinutes: -5
    });

    setTimeout(() => {
      expect(receivedInvalidEvent).toBe(false);
      done();
    }, 100);
  });
});
