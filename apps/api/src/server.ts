import http from "http";

import app from "./app";
import { env } from "@buzo/env";
import { initializeSocket } from "./realtime/socket";
import { bookingService } from "./services/booking.service";
import { RESERVATION_SWEEPER_INTERVAL_MS } from "./config/reservation.config";

const server = http.createServer(app);

initializeSocket(server);

// Start background reservation expiry sweeper with concurrency guard
let isSweeping = false;
export const expirySweeperTimer = setInterval(async () => {
    if (isSweeping) return;
    isSweeping = true;
    try {
        await bookingService.cleanupExpiredReservations();
    } catch (err) {
        console.error("Reservation expiry sweeper error:", err);
    } finally {
        isSweeping = false;
    }
}, RESERVATION_SWEEPER_INTERVAL_MS);

server.listen(env.PORT, () => {
    console.log(`🚀 Server running on ${env.PORT}`);
});
