import express from "express";
import cors from "cors";
import helmet from "helmet";

import authRoutes from "./routes/auth.routes";
import stopRoutes from "./routes/stop.routes";
import routeRoutes from "./routes/route.routes";
import busRoutes from "./routes/bus.routes";
import driverRoutes from "./routes/driver.routes";
import tripRoutes from "./routes/trip.routes";
import bookingRoutes from "./routes/booking.routes";
import seatRoutes from "./routes/seat.routes";
import busLocationRoutes from "./routes/bus-location.routes";
import chatRoutes from "./routes/chat.routes";
import paymentRoutes from "./routes/payment.routes";
import { errorHandler } from "./middleware/error.middleware";
import {
    authRateLimiter,
    chatRateLimiter,
    apiGeneralLimiter,
} from "./middleware/rate-limit.middleware";

const app = express();

// 1. Security Headers with Helmet (cross-origin resource policy enabled for web assets & maps)
app.use(
    helmet({
        crossOriginResourcePolicy: { policy: "cross-origin" },
    })
);

// 2. Cross-Origin Resource Sharing & Parsers
app.use(cors());
app.use(express.json());

// 3. Health & Readiness probes
app.get("/health", (_, res) => {
    res.status(200).json({
        status: "ok",
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
    });
});

app.get("/", (_, res) => {
    res.json({
        message: "🚍 Buzo API is running",
    });
});

// 4. Rate Limiting Middleware
app.use("/api", apiGeneralLimiter);
app.use("/api/auth/login", authRateLimiter);
app.use("/api/auth/signup", authRateLimiter);
app.use("/api/chat", chatRateLimiter);

// 5. Route Controllers
app.use("/api/auth", authRoutes);
app.use("/api/stops", stopRoutes);
app.use("/api/routes", routeRoutes);
app.use("/api/buses", busRoutes);
app.use("/api/drivers", driverRoutes);
app.use("/api/trips", tripRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api", seatRoutes);
app.use("/api/buses", busLocationRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/payments", paymentRoutes);

// 6. Global centralized error handling middleware
app.use(errorHandler);

export default app;
