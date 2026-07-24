import {
    execute,
    generateResponseStream,
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
            // We can wrap the static text in a stream for consistency
            async function* textStream() {
                yield action.text;
            }
            return {
                stream: textStream(),
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

        
        const stream = generateResponseStream(
            message,
            result
        );

        return {
            tool: action.name,
            data: result,
            stream,
        };
    }
}

export const chatService = new ChatService();