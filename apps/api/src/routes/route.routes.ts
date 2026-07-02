import { Router } from "express";

import { routeController } from "../controllers/route.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import { requireRole } from "../middleware/role.middleware";

const router = Router();

router.get("/", routeController.getAll);
router.get("/:id", routeController.getById);

router.post("/", authMiddleware, requireRole("ADMIN"), routeController.create);
router.patch("/:id", authMiddleware, requireRole("ADMIN"), routeController.update);
router.delete("/:id", authMiddleware, requireRole("ADMIN"), routeController.delete);

export default router;
