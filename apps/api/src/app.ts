import express from "express";

import authRoutes from "./routes/auth.routes";
import stopRoutes from "./routes/stop.routes";
import routeRoutes from "./routes/route.routes";
import busRoutes from "./routes/bus.routes";
import driverRoutes from "./routes/driver.routes";
import tripRoutes from "./routes/trip.routes";
import bookingRoutes from "./routes/booking.routes";
import seatRoutes from "./routes/seat.routes";

const app = express();

app.use(express.json());

app.get("/", (_, res) => {
    res.json({
        message: "🚍 Buzo API is running",
    });
});

app.use("/api/auth", authRoutes);
app.use("/api/stops", stopRoutes);
app.use("/api/routes", routeRoutes);
app.use("/api/buses", busRoutes);
app.use("/api/drivers", driverRoutes);
app.use("/api/trips", tripRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api", seatRoutes);

export default app;