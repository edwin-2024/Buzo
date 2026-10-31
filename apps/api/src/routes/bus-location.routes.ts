import { Router } from "express";

import { busLocationController } from "../controllers/bus-location.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import { requireRole } from "../middleware/role.middleware";

const router = Router();

router.get(
    "/locations",
    busLocationController.getAll
);

router.get(
    "/:busId/location",
    busLocationController.get
);

router.patch(
    "/:busId/location",
    authMiddleware,
    requireRole("DRIVER", "ADMIN"),
    busLocationController.update
);

export default router;
