import { Router } from "express";

import { stopController } from "../controllers/stop.controller";
// import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

// Public
router.get("/", stopController.getAll);
router.get("/:id", stopController.getById);

// Protected (enable auth later)
router.post("/", stopController.create);
router.patch("/:id", stopController.update);
router.delete("/:id", stopController.delete);

// Later:
// router.post("/", authMiddleware, stopController.create);
// router.patch("/:id", authMiddleware, stopController.update);
// router.delete("/:id", authMiddleware, stopController.delete);

export default router;