import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { createServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import { io as Client, Socket as ClientSocket } from "socket.io-client";
import { registerBusSocket } from "../src/realtime/bus.socket";

describe("Real-time Driver Rest-Break Status (Job: 005-driver-break-status)", () => {
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

  it("should broadcast bus:break to clients joined in the bus room", (done) => {
    const testBusId = "bus-202";

    // Client joins the bus room
    clientSocket.emit("bus:join", testBusId);

    // Listen for the broadcasted break event
    clientSocket.on("bus:break", (data: any) => {
      expect(data).toBeDefined();
      expect(data.busId).toBe(testBusId);
      expect(data.tripId).toBe("trip-999");
      expect(data.onBreak).toBe(true);
      expect(data.reason).toBe("Scheduled rest break at Highway Oasis");
      expect(typeof data.timestamp).toBe("string");
      done();
    });

    // Driver emits break event
    setTimeout(() => {
      clientSocket.emit("bus:break", {
        busId: testBusId,
        tripId: "trip-999",
        onBreak: true,
        reason: "Scheduled rest break at Highway Oasis"
      });
    }, 50);
  });

  it("should broadcast resumption event when onBreak is false", (done) => {
    const testBusId = "bus-303";

    clientSocket.emit("bus:join", testBusId);

    clientSocket.on("bus:break", (data: any) => {
      expect(data).toBeDefined();
      expect(data.busId).toBe(testBusId);
      expect(data.onBreak).toBe(false);
      expect(typeof data.timestamp).toBe("string");
      done();
    });

    setTimeout(() => {
      clientSocket.emit("bus:break", {
        busId: testBusId,
        onBreak: false
      });
    }, 50);
  });

  it("should reject break events missing busId or with non-boolean onBreak", (done) => {
    let receivedInvalidEvent = false;

    clientSocket.emit("bus:join", "bus-invalid");

    clientSocket.on("bus:break", () => {
      receivedInvalidEvent = true;
    });

    // Emit invalid events
    clientSocket.emit("bus:break", {
      busId: "",
      onBreak: true
    });

    clientSocket.emit("bus:break", {
      busId: "bus-invalid",
      onBreak: "true" as any
    });

    clientSocket.emit("bus:break", {
      busId: "bus-invalid"
    } as any);

    setTimeout(() => {
      expect(receivedInvalidEvent).toBe(false);
      done();
    }, 100);
  });
});
