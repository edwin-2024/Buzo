import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { env } from "@buzo/env";
import { Pool } from "pg";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

let prismaClient: PrismaClient;

if (globalForPrisma.prisma) {
    prismaClient = globalForPrisma.prisma;
} else {
    const pool = new Pool({
        connectionString: env.DATABASE_URL,
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