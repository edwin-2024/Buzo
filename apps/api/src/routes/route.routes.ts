import { Router } from "express";

import { routeController } from "../controllers/route.controller";
// import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

router.get("/", routeController.getAll);
router.get("/:id", routeController.getById);

router.post("/", routeController.create);
router.patch("/:id", routeController.update);
router.delete("/:id", routeController.delete);

// Later:
// router.post("/", authMiddleware, requireRole("ADMIN"), routeController.create);

export default router;
