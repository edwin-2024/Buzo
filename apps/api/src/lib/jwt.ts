import jwt from "jsonwebtoken";
import crypto from "node:crypto";

import { env } from "@buzo/env";

export interface JwtPayload {
    userId: string;
    role: "ADMIN" | "DRIVER" | "PASSENGER";
    jti?: string;
    iat?: number;
    exp?: number;
}

const EXPIRES_IN = process.env.JWT_EXPIRES_IN || "1d";

export function signToken(payload: JwtPayload): string {
    const jti = payload.jti || crypto.randomUUID();
    return jwt.sign({ ...payload, jti }, env.JWT_SECRET, {
        expiresIn: EXPIRES_IN as any,
    });
}

export function verifyToken(token: string): JwtPayload {
    return jwt.verify(token, env.JWT_SECRET) as JwtPayload;
}
