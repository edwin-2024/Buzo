import { Router } from "express";

import { busController } from "../controllers/bus.controller";
// import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

router.get("/", busController.getAll);
router.get("/:id", busController.getById);

router.post("/", busController.create);
router.patch("/:id", busController.update);
router.delete("/:id", busController.delete);

// Later:
// router.post("/", authMiddleware, requireRole("ADMIN"), busController.create);

export default router;