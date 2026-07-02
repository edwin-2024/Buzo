import { Router } from "express";

import { chatController } from "../controllers/chat.controller";
import { optionalAuthMiddleware } from "../middleware/auth.middleware";

const router = Router();

router.post(
    "/",
    optionalAuthMiddleware,
    chatController.chat
);

export default router;