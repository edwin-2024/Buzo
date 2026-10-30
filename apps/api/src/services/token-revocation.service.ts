import crypto from "node:crypto";
import type { JwtPayload } from "../lib/jwt";

class TokenRevocationService {
    // Map of tokenHash -> expiresAtMs
    private revokedTokens = new Map<string, number>();

    // Map of userId -> timestampMs (all tokens issued before this are invalid)
    private userRevocations = new Map<string, number>();

    private hashToken(token: string): string {
        return crypto.createHash("sha256").update(token).digest("hex");
    }

    /**
     * Revoke an individual token (e.g. on user logout).
     * The token is stored until its natural expiration timestamp.
     */
    revokeToken(token: string, payload?: JwtPayload): void {
        const tokenHash = this.hashToken(token);
        // Expiration defaults to 24h from now if not present in payload
        const expiresAtMs = payload?.exp ? payload.exp * 1000 : Date.now() + 24 * 60 * 60 * 1000;
        this.revokedTokens.set(tokenHash, expiresAtMs);
    }

    /**
     * Revoke all active tokens for a specific user (e.g. on demotion, password reset, or account lock).
     */
    revokeAllUserTokens(userId: string): void {
        this.userRevocations.set(userId, Date.now());
    }

    /**
     * Check if a token has been revoked either individually or via user-wide invalidation.
     */
    isRevoked(token: string, payload: JwtPayload): boolean {
        // 1. Check user-wide revocation timestamp
        const userRevokedAt = this.userRevocations.get(payload.userId);
        if (userRevokedAt && payload.iat) {
            const tokenIssuedAtMs = payload.iat * 1000;
            if (tokenIssuedAtMs <= userRevokedAt) {
                return true;
            }
        }

        // 2. Check individual token blacklist
        const tokenHash = this.hashToken(token);
        const expiresAtMs = this.revokedTokens.get(tokenHash);
        if (expiresAtMs) {
            if (Date.now() > expiresAtMs) {
                // Expired entry, delete lazily
                this.revokedTokens.delete(tokenHash);
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
        for (const [hash, expMs] of this.revokedTokens.entries()) {
            if (now > expMs) {
                this.revokedTokens.delete(hash);
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
