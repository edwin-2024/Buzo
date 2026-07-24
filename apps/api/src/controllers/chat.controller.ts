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
            const { message, history } = chatSchema.parse(
                req.body
            );

            const result =
                await chatService.chat(
                    message,
                    history,
                    req.user?.userId
                );

            // Set up SSE headers
            res.setHeader('Content-Type', 'text/event-stream');
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Connection', 'keep-alive');
            
            // If there's tool data, send it first as an event
            if (result.tool) {
                res.write(`data: ${JSON.stringify({ tool: result.tool, data: result.data })}\n\n`);
            }

            // Iterate through the stream and send chunks
            if (result.stream) {
                for await (const chunk of result.stream) {
                    if (chunk) {
                        res.write(`data: ${JSON.stringify({ response: chunk })}\n\n`);
                    }
                }
            }

            // Signal the end of the stream
            res.write(`data: [DONE]\n\n`);
            res.end();
        } catch (error) {
            if (!res.headersSent) {
                next(error);
            } else {
                res.write(`data: ${JSON.stringify({ error: "Stream interrupted" })}\n\n`);
                res.end();
            }
        }
    };
}

export const chatController =
    new ChatController();