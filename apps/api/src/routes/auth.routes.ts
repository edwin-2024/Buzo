import { Router } from "express";

import { authController } from "../controllers/auth.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import { authRateLimiter } from "../middleware/rate-limit.middleware";

const router = Router();

router.post("/signup", authRateLimiter, authController.signUp);

router.post("/login", authRateLimiter, authController.login);

router.post(
    "/logout",
    authMiddleware,
    authController.logout
);

router.get(
    "/me",
    authMiddleware,
    authController.me
);

export default router;
