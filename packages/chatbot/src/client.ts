import { GoogleGenAI, Type } from "@google/genai";
import { env } from "@buzo/env";

// ──────────────────────────────────────────
// Types
// ──────────────────────────────────────────

interface LLMToolCall {
    name: string;
    arguments: Record<string, unknown>;
}

interface LLMResponse {
    content?: string;
    toolCalls?: LLMToolCall[];
}

export interface ToolDef {
    name: string;
    description: string;
    parameters: {
        type: string;
        properties: Record<string, unknown>;
        required?: string[];
    };
}

// ──────────────────────────────────────────
// Ollama Provider
// ──────────────────────────────────────────

/** Strip qwen3's <think>…</think> reasoning tags from output */
function stripThinkTags(text: string): string {
    return text.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
}

async function ollamaChat(
    messages: { role: string; content: string }[],
    tools?: { type: "function"; function: ToolDef }[]
): Promise<LLMResponse> {
    const url = env.OLLAMA_URL;
    const model = env.OLLAMA_MODEL;

    const body: Record<string, unknown> = {
        model,
        messages,
        stream: false,
    };

    if (tools && tools.length > 0) {
        body.tools = tools;
    }

    const res = await fetch(`${url}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });

    if (!res.ok) {
        throw new Error(
            `Ollama request failed: ${res.status} ${res.statusText}`
        );
    }

    const data: any = await res.json();
    const msg = data.message;

    return {
        content: msg.content
            ? stripThinkTags(msg.content)
            : undefined,
        toolCalls: msg.tool_calls?.map(
            (tc: any) => ({
                name: tc.function.name,
                arguments:
                    typeof tc.function.arguments ===
                    "string"
                        ? JSON.parse(
                              tc.function.arguments
                          )
                        : tc.function.arguments,
            })
        ),
    };
}

// ──────────────────────────────────────────
// Gemini Provider (fallback)
// ──────────────────────────────────────────

const GEMINI_TYPE_MAP: Record<string, string> = {
    object: Type.OBJECT,
    string: Type.STRING,
    number: Type.NUMBER,
    integer: Type.INTEGER,
    boolean: Type.BOOLEAN,
    array: Type.ARRAY,
};

/** Convert lowercase JSON Schema types → Gemini's uppercase Type enum */
function toGeminiSchema(schema: any): any {
    if (!schema) return schema;
    const result = { ...schema };

    if (
        result.type &&
        GEMINI_TYPE_MAP[result.type]
    ) {
        result.type = GEMINI_TYPE_MAP[result.type];
    }
    if (result.properties) {
        result.properties = Object.fromEntries(
            Object.entries(
                result.properties
            ).map(([key, val]: [string, any]) => [
                key,
                toGeminiSchema(val),
            ])
        );
    }
    if (result.items) {
        result.items = toGeminiSchema(result.items);
    }
    return result;
}

function getGeminiClient(): GoogleGenAI {
    if (!env.GEMINI_API_KEY) {
        throw new Error(
            "GEMINI_API_KEY is required when LLM_PROVIDER is 'gemini'"
        );
    }
    return new GoogleGenAI({
        apiKey: env.GEMINI_API_KEY,
    });
}

async function geminiChat(
    prompt: string,
    systemPrompt: string,
    tools?: ToolDef[],
    history?: { role: string; content: string }[]
): Promise<LLMResponse> {
    const ai = getGeminiClient();

    const config: Record<string, unknown> = {
        systemInstruction: systemPrompt,
    };

    if (tools && tools.length > 0) {
        config.tools = [
            {
                functionDeclarations: tools.map(
                    (t) => ({
                        name: t.name,
                        description: t.description,
                        parameters: toGeminiSchema(
                            t.parameters
                        ),
                    })
                ),
            },
        ];
    }

    const contents = [
        ...(history || []).map(m => ({
            role: m.role === "assistant" ? "model" : "user",
            parts: [{ text: m.content }]
        })),
        { role: "user", parts: [{ text: prompt }] }
    ];

    const response =
        await ai.models.generateContent({
            model: "gemini-2.5-flash-lite",
            contents: contents as any,
            config,
        });

    const functionCall =
        response.functionCalls?.[0];

    return {
        content: response.text ?? undefined,
        toolCalls: functionCall
            ? [
                  {
                      name: functionCall.name!,
                      arguments:
                          (functionCall.args as Record<
                              string,
                              unknown
                          >) ?? {},
                  },
              ]
            : undefined,
    };
}

// ──────────────────────────────────────────
// Streaming Providers
// ──────────────────────────────────────────

export async function* ollamaChatStream(
    userMessage: string,
    systemPrompt: string
): AsyncGenerator<string, void, unknown> {
    const url = env.OLLAMA_URL;
    const model = env.OLLAMA_MODEL;

    const res = await fetch(`${url}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            model,
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userMessage },
            ],
            stream: true,
        }),
    });

    if (!res.ok || !res.body) {
        throw new Error(`Ollama request failed: ${res.status} ${res.statusText}`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let insideThink = false;

    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";
            
            for (const line of lines) {
                if (!line.trim()) continue;
                try {
                    const data = JSON.parse(line);
                    let content = data.message?.content ?? "";
                    if (!content) continue;

                    // Stateful think-tag filtering: suppress
                    // content between <think> and </think>
                    if (insideThink) {
                        const endIdx = content.indexOf("</think>");
                        if (endIdx === -1) continue; // still inside, skip
                        content = content.slice(endIdx + 8);
                        insideThink = false;
                    }

                    const startIdx = content.indexOf("<think>");
                    if (startIdx !== -1) {
                        const before = content.slice(0, startIdx);
                        const afterThink = content.slice(startIdx + 7);
                        const endIdx = afterThink.indexOf("</think>");
                        if (endIdx !== -1) {
                            content = before + afterThink.slice(endIdx + 8);
                        } else {
                            content = before;
                            insideThink = true;
                        }
                    }

                    if (content) {
                        yield content;
                    }
                } catch (e) {
                    // Ignore parse errors for incomplete lines
                }
            }
        }
    } finally {
        reader.releaseLock();
    }
}

export async function* geminiChatStream(
    userMessage: string,
    systemPrompt: string
): AsyncGenerator<string, void, unknown> {
    const ai = getGeminiClient();

    const responseStream = await ai.models.generateContentStream({
        model: "gemini-2.5-flash-lite",
        contents: [{ role: "user", parts: [{ text: userMessage }] }],
        config: { systemInstruction: systemPrompt },
    });

    for await (const chunk of responseStream) {
        if (chunk.text) {
            yield chunk.text;
        }
    }
}

// ──────────────────────────────────────────
// Public API (provider-agnostic)
// ──────────────────────────────────────────

const provider = env.LLM_PROVIDER;

/**
 * Send a message to the LLM with tool definitions.
 * Returns tool calls if the model wants to invoke a tool,
 * or text content for a direct response.
 */
export async function callLLMWithTools(
    userMessage: string,
    systemPrompt: string,
    tools: ToolDef[],
    history?: { role: string; content: string }[]
): Promise<LLMResponse> {
    if (provider === "gemini") {
        return geminiChat(
            userMessage,
            systemPrompt,
            tools,
            history
        );
    }

    return ollamaChat(
        [
            { role: "system", content: systemPrompt },
            ...(history || []),
            { role: "user", content: userMessage },
        ],
        tools.map((t) => ({
            type: "function" as const,
            function: t,
        }))
    );
}

/**
 * Send a message to the LLM for a plain text streaming response (no tools).
 */
export async function* callLLMStream(
    userMessage: string,
    systemPrompt: string
): AsyncGenerator<string, void, unknown> {
    if (provider === "gemini") {
        yield* geminiChatStream(userMessage, systemPrompt);
    } else {
        yield* ollamaChatStream(userMessage, systemPrompt);
    }
}