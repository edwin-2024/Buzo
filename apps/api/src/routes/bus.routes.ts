import { Router } from "express";

import { busController } from "../controllers/bus.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import { requireRole } from "../middleware/role.middleware";

const router = Router();

router.get("/", busController.getAll);
router.get("/:id", busController.getById);

router.post("/", authMiddleware, requireRole("ADMIN"), busController.create);
router.patch("/:id", authMiddleware, requireRole("ADMIN"), busController.update);
router.delete("/:id", authMiddleware, requireRole("ADMIN"), busController.delete);

export default router;