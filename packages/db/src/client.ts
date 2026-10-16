import dns from "node:dns";
import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { env } from "@buzo/env";
import { Pool } from "pg";

// Resilient DNS resolution for Neon database endpoints (fixes mobile hotspot / router query refused)
const resolver = new dns.Resolver();
resolver.setServers(["8.8.8.8", "1.1.1.1"]);

const originalLookup = dns.lookup;
if (!(dns as unknown as { __neon_dns_patched?: boolean }).__neon_dns_patched) {
    (dns as unknown as { __neon_dns_patched: boolean }).__neon_dns_patched = true;
    (dns as unknown as { lookup: typeof dns.lookup }).lookup = function (
        hostname: string,
        options: any,
        callback?: any
    ) {
        let cb = callback;
        let opts = options;
        if (typeof options === "function") {
            cb = options;
            opts = {};
        } else if (typeof options === "number") {
            opts = { family: options };
        }

        if (typeof hostname === "string" && hostname.includes("neon.tech")) {
            const requestedFamily = opts?.family;
            const resolveFn = requestedFamily === 6 ? resolver.resolve6.bind(resolver) : resolver.resolve4.bind(resolver);
            const familyNumber = requestedFamily === 6 ? 6 : 4;

            resolveFn(hostname, (err, addresses) => {
                if (!err && addresses && addresses.length > 0) {
                    if (opts?.all) {
                        cb(null, addresses.map((addr) => ({ address: addr, family: familyNumber })));
                    } else {
                        cb(null, addresses[0], familyNumber);
                    }
                    return;
                }
                originalLookup(hostname, options, callback);
            });
            return;
        }

        return originalLookup(hostname, options, callback);
    } as typeof dns.lookup;
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