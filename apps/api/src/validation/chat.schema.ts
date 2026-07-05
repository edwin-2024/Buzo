import { z } from "zod";

export const chatSchema = z.object({
    message: z.string().min(1),
    history: z.array(z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string()
    })).optional()
});

export type ChatInput =
    z.infer<typeof chatSchema>;