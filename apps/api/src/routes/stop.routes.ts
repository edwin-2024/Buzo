import { Router } from "express";

import { stopController } from "../controllers/stop.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import { requireRole } from "../middleware/role.middleware";

const router = Router();

// Public
router.get("/", stopController.getAll);
router.get("/:id", stopController.getById);

// Protected (enable auth later)
router.post("/", authMiddleware, requireRole("ADMIN"), stopController.create);
router.patch("/:id", authMiddleware, requireRole("ADMIN"), stopController.update);
router.delete("/:id", authMiddleware, requireRole("ADMIN"), stopController.delete);

export default router;