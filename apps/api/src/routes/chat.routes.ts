import { Router } from "express";

import { chatController } from "../controllers/chat.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

router.post(
    "/",
    authMiddleware,
    chatController.chat
);

export default router;