import { Router } from "express";

import { chatController } from "../controllers/chat.controller";
import { optionalAuthMiddleware } from "../middleware/auth.middleware";
import { chatRateLimiter } from "../middleware/rate-limit.middleware";

const router = Router();

router.post(
    "/",
    chatRateLimiter,
    optionalAuthMiddleware,
    chatController.chat
);

export default router;
