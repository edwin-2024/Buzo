import { Router } from "express";

import { tripController } from "../controllers/trip.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import { requireRole } from "../middleware/role.middleware";

const router = Router();

router.get("/", tripController.getAll);
router.get("/my-trips", authMiddleware, requireRole("DRIVER", "ADMIN"), tripController.getMyTrips);
router.get("/:id", tripController.getById);

router.post("/", authMiddleware, requireRole("ADMIN"), tripController.create);

router.patch("/:id", authMiddleware, requireRole("ADMIN", "DRIVER"), tripController.update);

router.delete("/:id", authMiddleware, requireRole("ADMIN"), tripController.delete);

export default router;