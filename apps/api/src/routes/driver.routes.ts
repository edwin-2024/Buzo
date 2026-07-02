import { Router } from "express";

import { driverController } from "../controllers/driver.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import { requireRole } from "../middleware/role.middleware";

const router = Router();

router.get("/", driverController.getAll);
router.get("/:id", driverController.getById);

router.post("/", authMiddleware, requireRole("ADMIN"), driverController.create);

router.patch(
    "/:id/assign-bus",
    authMiddleware,
    requireRole("ADMIN"),
    driverController.assignBus
);

router.delete("/:id", authMiddleware, requireRole("ADMIN"), driverController.delete);

export default router;