import { Router } from "express";

import { seatController } from "../controllers/seat.controller";

const router = Router();

router.get(
    "/trips/:tripId/seats",
    seatController.getByTrip
);

export default router;