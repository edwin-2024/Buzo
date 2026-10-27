import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { env } from "@buzo/env";
import { Pool } from "pg";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

let prismaClient: PrismaClient;

if (globalForPrisma.prisma) {
    prismaClient = globalForPrisma.prisma;
} else {
    let connectionString = env.DATABASE_URL;
    try {
        const u = new URL(env.DATABASE_URL);
        if (u.hostname.includes("neon.tech")) {
            const endpoint = u.hostname.split("-pooler")[0]?.split(".")[0];
            if (endpoint && !u.searchParams.has("options")) {
                u.searchParams.set("options", `endpoint=${endpoint}`);
            }
            // Use direct IP fallback if explicitly set or on Windows local development where router DNS refuses Neon CNAMEs
            if (process.env.NEON_DIRECT_IP || (process.platform === "win32" && process.env.NODE_ENV !== "production")) {
                u.hostname = process.env.NEON_DIRECT_IP || "52.45.105.76";
                connectionString = u.toString();
            }
        }
    } catch (e) {
        console.warn("Failed to parse DATABASE_URL for Neon endpoint fallback:", e);
    }

    // Sync process.env.DATABASE_URL so Prisma's internal engine also connects directly via the resilient IP
    process.env.DATABASE_URL = connectionString;

    const pool = new Pool({
        connectionString,
        ssl: {
            rejectUnauthorized: false,
        },
    });
    
    pool.on("error", (err) => {
        console.error("Unexpected error on idle client", err);
    });

    const adapter = new PrismaPg(pool);
    prismaClient = new PrismaClient({ 
        adapter,
        log: ['error', 'warn'] 
    });
}

export const prisma = prismaClient;

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prismaClient;
