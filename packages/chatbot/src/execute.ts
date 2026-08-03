import { callLLMWithTools } from "./client";
import { toolRegistry } from "./tools/registry";
import { SYSTEM_PROMPT } from "./prompts";

export async function execute(
    prompt: string,
    history?: { role: string; content: string }[]
) {
    const now = new Date();
    const dates = Array.from({ length: 5 }).map((_, i) => {
        const d = new Date(now);
        d.setDate(d.getDate() + i);
        return d.toISOString().split("T")[0];
    });

    const dynamicSystemPrompt =
        SYSTEM_PROMPT +
        `\n\nCRITICAL CONTEXT: The current date is ${dates[0]}. Tomorrow is ${dates[1]}. The day after tomorrow is ${dates[2]}. The following days are ${dates[3]} and ${dates[4]}. You have access to trips on these dates. NEVER say you cannot check future dates.`;

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