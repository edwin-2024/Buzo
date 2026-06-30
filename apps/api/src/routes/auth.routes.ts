import { Router } from "express";

import { authController } from "../controllers/auth.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

router.post("/signup", (req, res, next) =>
    authController.signUp(req, res, next)
);

router.post("/login", (req, res, next) =>
    authController.login(req, res, next)
);

router.get(
    "/me",
    authMiddleware,
    (req, res, next) => authController.me(req, res, next)
);

export default router;