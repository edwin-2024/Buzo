import { ai } from "./client";
import { toolRegistry } from "./tools/registry";
import { SYSTEM_PROMPT } from "./prompts";

export async function execute(prompt: string) {
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-lite",

        contents: prompt,

        config: {
            systemInstruction: SYSTEM_PROMPT,
            tools: [
                {
                    functionDeclarations: toolRegistry,
                },
            ],
        },
    });

    const functionCall =
        response.functionCalls?.[0];

    if (!functionCall) {
        return {
            type: "text",
            text:
                response.text ??
                "I couldn't understand the request.",
        };
    }

    return {
        type: "function",

        name: functionCall.name,

        arguments: functionCall.args ?? {},
    };
}