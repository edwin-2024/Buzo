import dns from "node:dns";
import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { env } from "@buzo/env";
import { Pool } from "pg";

// Resilient DNS resolution for Neon database endpoints (fixes mobile hotspot / router query refused)
const resolver = new dns.Resolver();
resolver.setServers(["8.8.8.8", "1.1.1.1"]);

const originalLookup = dns.lookup;
if (!(dns as any).__neon_dns_patched) {
    (dns as any).__neon_dns_patched = true;
    (dns as any).lookup = function (hostname: string, options: any, callback: any) {
        if (typeof options === "function") {
            callback = options;
            options = {};
        }

        if (typeof hostname === "string" && hostname.includes("neon.tech")) {
            resolver.resolve4(hostname, (err, addresses) => {
                if (!err && addresses && addresses.length > 0) {
                    if (options && options.all) {
                        callback(null, addresses.map((addr) => ({ address: addr, family: 4 })));
                    } else {
                        callback(null, addresses[0], 4);
                    }
                    return;
                }
                originalLookup(hostname, options, callback);
            });
            return;
        }

        return originalLookup(hostname, options, callback);
    };
}

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

let prismaClient: PrismaClient;

if (globalForPrisma.prisma) {
    prismaClient = globalForPrisma.prisma;
} else {
    const pool = new Pool({
        connectionString: env.DATABASE_URL,
        ssl: {
            rejectUnauthorized: false,
        },
        max: 20,
        idleTimeoutMillis: 60000,
        connectionTimeoutMillis: 30000,
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