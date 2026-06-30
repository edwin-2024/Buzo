import jwt from "jsonwebtoken";

import { env } from "@buzo/env";

export interface JwtPayload {
    userId: string;
    role: "ADMIN" | "DRIVER" | "PASSENGER";
}

const EXPIRES_IN = "7d";


export function signToken(payload: JwtPayload): string {
    return jwt.sign(payload, env.JWT_SECRET, {
        expiresIn: EXPIRES_IN,
    });
}


export function verifyToken(token: string): JwtPayload {
    return jwt.verify(token, env.JWT_SECRET) as JwtPayload;
}