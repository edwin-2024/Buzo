import { callLLMWithTools } from "./client";
import { toolRegistry } from "./tools/registry";
import { SYSTEM_PROMPT } from "./prompts";

export async function execute(prompt: string) {
    const response = await callLLMWithTools(
        prompt,
        SYSTEM_PROMPT,
        toolRegistry
    );

    if (
        response.toolCalls &&
        response.toolCalls.length > 0
    ) {
        const toolCall = response.toolCalls[0]!;

        return {
            type: "function" as const,
            name: toolCall.name,
            arguments: toolCall.arguments,
        };
    }

    return {
        type: "text" as const,
        text:
            response.content ??
            "I couldn't understand the request.",
    };
}