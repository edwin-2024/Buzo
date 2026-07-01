import {
    execute,
    generateResponse,
} from "@buzo/chatbot";

import { toolHandlers } from "../chat/handlers/registry";

export class ChatService {
    async chat(
        message: string,
        userId?: string
    ) {
        const action = await execute(message);

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
            return {
                tool: action.name,
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