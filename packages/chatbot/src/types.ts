export interface ChatInput {
    question: string;
    context: string;
}

export interface ToolDefinition {
    name: string;
    description: string;

    parameters: {
        type: "object";
        properties: Record<string, unknown>;
        required?: string[];
    };
}

export interface ToolCall {
    name: string;
    arguments: Record<string, unknown>;
}