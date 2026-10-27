import http from "http";

import app from "./app";
import { env } from "@buzo/env";
import { initializeSocket } from "./realtime/socket";
import { bookingService } from "./services/booking.service";
import { RESERVATION_SWEEPER_INTERVAL_MS } from "./config/reservation.config";

const server = http.createServer(app);

initializeSocket(server);

// Start background reservation expiry sweeper
export const expirySweeperTimer = setInterval(async () => {
    try {
        await bookingService.cleanupExpiredReservations();
    } catch (err) {
        console.error("Reservation expiry sweeper error:", err);
    }
}, RESERVATION_SWEEPER_INTERVAL_MS);

server.listen(env.PORT, () => {
    console.log(`🚀 Server running on ${env.PORT}`);
});
