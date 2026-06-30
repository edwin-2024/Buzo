import express from "express";

import authRoutes from "./routes/auth.routes";
import stopRoutes from "./routes/stop.routes";

const app = express();

app.use(express.json());

app.get("/", (_, res) => {
    res.json({
        message: "🚍 Buzo API is running",
    });
});

app.use("/api/auth", authRoutes);
app.use("/api/stops", stopRoutes);

export default app;