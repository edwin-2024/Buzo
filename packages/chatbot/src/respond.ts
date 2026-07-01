import { ai } from "./client";
import { SYSTEM_PROMPT } from "./prompts";

export async function generateResponse(
    question: string,
    toolResult: unknown
) {
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-lite",
        contents: `
User Question: ${question}

Database Result:
${JSON.stringify(toolResult, null, 2)}

Respond in a friendly, concise manner.
`,
        config: {
            systemInstruction: `${SYSTEM_PROMPT}

The backend has already executed the requested operation.
The JSON below is the exact result returned from the database.
It is authoritative.
If it contains data, answer using ONLY that data.
Never say you couldn't find the information if the JSON contains data.
If the JSON is null, an empty object, or an empty array, reply:
"I couldn't find that information."`,
        },
    });

    return response.text ?? "I couldn't generate a response.";
}