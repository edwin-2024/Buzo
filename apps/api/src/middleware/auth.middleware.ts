import type { Request, Response, NextFunction } from "express";

import { verifyToken } from "../lib/jwt";
import { tokenRevocationService } from "../services/token-revocation.service";

export async function authMiddleware(
    req: Request,
    res: Response,
    next: NextFunction
) {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader) {
            return res.status(401).json({
                message: "Authorization header missing",
            });
        }

        const match = authHeader.match(/^Bearer\s+(.*)$/i);
        if (!match || !match[1]) {
            return res.status(401).json({
                message: "Invalid authorization header format",
            });
        }

        const token = match[1].trim();
        if (!token) {
            return res.status(401).json({
                message: "Invalid token",
            });
        }

        const payload = verifyToken(token);

        if (tokenRevocationService.isRevoked(token, payload)) {
            return res.status(401).json({
                message: "Token has been revoked or invalidated. Please log in again.",
            });
        }

        req.user = payload;
        req.token = token;

        next();
    } catch {
        return res.status(401).json({
            message: "Invalid or expired token",
        });
    }
}

export async function optionalAuthMiddleware(
    req: Request,
    _res: Response,
    next: NextFunction
) {
    try {
        const authHeader = req.headers.authorization;

        if (authHeader) {
            const match = authHeader.match(/^Bearer\s+(.*)$/i);
            if (match && match[1]) {
                const token = match[1].trim();
                const payload = verifyToken(token);
                if (!tokenRevocationService.isRevoked(token, payload)) {
                    req.user = payload;
                    req.token = token;
                }
            }
        }
    } catch {
        // Ignore invalid token, just don't set req.user
    }
    
    next();
}
