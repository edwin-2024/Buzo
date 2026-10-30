import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import type { JwtPayload } from "../lib/jwt";

export const DEFAULT_REVOCATION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

interface UserRevocationEntry {
    revokedAtSec: number;
    expiresAtMs: number;
}

class TokenRevocationService {
    // Map of token identifier (jti or SHA-256 hash) -> expiresAtMs
    private revokedTokens = new Map<string, number>();

    // Map of userId -> UserRevocationEntry (cleared after 24h)
    private userRevocations = new Map<string, UserRevocationEntry>();

    private hashToken(token: string): string {
        return crypto.createHash("sha256").update(token).digest("hex");
    }

    private resolveTokenKey(token: string, payload?: JwtPayload): string {
        if (payload?.jti) {
            return payload.jti;
        }
        try {
            const decoded = jwt.decode(token) as JwtPayload | null;
            if (decoded?.jti) {
                return decoded.jti;
            }
        } catch {
            // Non-JWT token string
        }
        return this.hashToken(token);
    }

    /**
     * Revoke an individual token (e.g. on user logout).
     * Stored until its natural expiration timestamp, then swept.
     */
    revokeToken(token: string, payload?: JwtPayload): void {
        const key = this.resolveTokenKey(token, payload);
        let expiresAtMs: number;
        if (payload?.exp) {
            expiresAtMs = payload.exp * 1000;
        } else {
            try {
                const decoded = jwt.decode(token) as JwtPayload | null;
                expiresAtMs = decoded?.exp ? decoded.exp * 1000 : Date.now() + DEFAULT_REVOCATION_TTL_MS;
            } catch {
                expiresAtMs = Date.now() + DEFAULT_REVOCATION_TTL_MS;
            }
        }
        this.revokedTokens.set(key, expiresAtMs);
    }

    /**
     * Revoke all active tokens for a specific user (e.g. on demotion, password reset, or account lock).
     * Any token issued on or before this timestamp is invalidated.
     */
    revokeAllUserTokens(userId: string): void {
        const nowMs = Date.now();
        this.userRevocations.set(userId, {
            revokedAtSec: Math.floor(nowMs / 1000),
            expiresAtMs: nowMs + DEFAULT_REVOCATION_TTL_MS,
        });
    }

    /**
     * Check if a token has been revoked either individually or via user-wide invalidation.
     */
    isRevoked(token: string, payload: JwtPayload): boolean {
        // 1. Check user-wide revocation timestamp
        const userEntry = this.userRevocations.get(payload.userId);
        if (userEntry && payload.iat) {
            // If token was issued on or before the revocation second, consider revoked
            if (payload.iat <= userEntry.revokedAtSec) {
                return true;
            }
        }

        // 2. Check individual token identifier (jti preferred, or hash)
        const key = this.resolveTokenKey(token, payload);
        const expiresAtMs = this.revokedTokens.get(key);
        if (expiresAtMs) {
            if (Date.now() > expiresAtMs) {
                this.revokedTokens.delete(key);
                return false;
            }
            return true;
        }

        return false;
    }

    /**
     * Periodic cleanup of expired entries from the blacklist to prevent unbounded memory growth.
     */
    cleanupExpired(): number {
        const now = Date.now();
        let cleaned = 0;

        for (const [key, expMs] of this.revokedTokens.entries()) {
            if (now > expMs) {
                this.revokedTokens.delete(key);
                cleaned++;
            }
        }

        for (const [userId, entry] of this.userRevocations.entries()) {
            if (now > entry.expiresAtMs) {
                this.userRevocations.delete(userId);
                cleaned++;
            }
        }

        return cleaned;
    }

    /**
     * Reset in-memory revocation store (useful for test suites).
     */
    clearForTesting(): void {
        this.revokedTokens.clear();
        this.userRevocations.clear();
    }
}

export const tokenRevocationService = new TokenRevocationService();
