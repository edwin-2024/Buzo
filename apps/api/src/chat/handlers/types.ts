export interface ToolHandler {
    (args: Record<string, unknown>, userId?: string): Promise<unknown>;
}