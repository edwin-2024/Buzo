import { Router } from "express";

import { busLocationController } from "../controllers/bus-location.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

router.get(
    "/:busId/location",
    busLocationController.get
);

router.patch(
    "/:busId/location",
    authMiddleware,
    busLocationController.update
);

export default router;