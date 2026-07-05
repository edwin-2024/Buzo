import { callLLMWithTools } from "./client";
import { toolRegistry } from "./tools/registry";
import { SYSTEM_PROMPT } from "./prompts";

export async function execute(
    prompt: string,
    history?: { role: string; content: string }[]
) {
    const today = new Date().toISOString().split('T')[0];
    const dynamicSystemPrompt = SYSTEM_PROMPT + `\n\nCRITICAL CONTEXT: The current date is ${today}. You have access to trips today and in the future. NEVER say you cannot check future dates.`;

    const response = await callLLMWithTools(
        prompt,
        dynamicSystemPrompt,
        toolRegistry,
        history
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