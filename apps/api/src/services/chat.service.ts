import {
    execute,
    generateResponse,
} from "@buzo/chatbot";

import { toolHandlers } from "../chat/handlers/registry";

export class ChatService {
    async chat(
        message: string,
        history?: { role: "user" | "assistant", content: string }[],
        userId?: string
    ) {
        const action = await execute(message, history);

        // Gemini answered directly
        if (action.type === "text") {
            return {
                response: action.text,
            };
        }

        const handler = toolHandlers[action.name];

        if (!handler) {
            throw new Error(
                `Unknown tool: ${action.name}`
            );
        }

        let result;
        try {
            result = await handler(action.arguments, userId);
        } catch (error: any) {
            result = {
                error: error.message ?? "Tool execution failed",
            };
        }
        
        const response =
            await generateResponse(
                message,
                result
            );

        return {
            tool: action.name,
            data: result,
            response,
        };
    }
}

export const chatService =
    new ChatService();