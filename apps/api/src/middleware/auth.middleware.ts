import type { Request, Response, NextFunction } from "express";

import { verifyToken } from "../lib/jwt";

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

        if (!authHeader.startsWith("Bearer ")) {
            return res.status(401).json({
                message: "Invalid authorization header",
            });
        }

        const token = authHeader.split(" ")[1];

        if (!token) {
            return res.status(401).json({
                message: "Invalid token",
            });
        }

        const payload = verifyToken(token);

        req.user = payload;

        next();
    } catch {
        return res.status(401).json({
            message: "Invalid or expired token",
        });
    }
}