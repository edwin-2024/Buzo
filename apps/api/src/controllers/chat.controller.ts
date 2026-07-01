import type {
    Request,
    Response,
    NextFunction,
} from "express";

import { chatSchema } from "../validation/chat.schema";
import { chatService } from "../services/chat.service";

export class ChatController {
    chat = async (
        req: Request,
        res: Response,
        next: NextFunction
    ) => {
        try {
            const { message } = chatSchema.parse(
                req.body
            );

            const result =
                await chatService.chat(
                    message,
                    req.user?.userId
                );

            res.json(result);
        } catch (error) {
            next(error);
        }
    };
}

export const chatController =
    new ChatController();