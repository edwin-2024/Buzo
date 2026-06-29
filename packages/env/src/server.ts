import { config } from "dotenv";
import { resolve } from "node:path";
import { z } from "zod";

config({
    path: resolve(import.meta.dir, "../../../.env"),
});

const envSchema = z.object({
    DATABASE_URL: z.string().url(),

    JWT_SECRET: z
        .string()
        .min(32, "JWT_SECRET must be at least 32 characters long"),

    GEMINI_API_KEY: z.string().min(1),

    PORT: z.coerce.number().int().positive().default(5000),

    CLIENT_URL: z.string().url(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
    console.error("❌ Invalid environment variables:");
    console.error(parsed.error.format());
    process.exit(1);
}

export const env = parsed.data;