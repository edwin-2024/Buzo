import express from "express";

import authRoutes from "./routes/auth.routes";
import stopRoutes from "./routes/stop.routes";
import routeRoutes from "./routes/route.routes";
import busRoutes from "./routes/bus.routes";

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

export default app;