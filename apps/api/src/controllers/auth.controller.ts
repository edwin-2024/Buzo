import type { Request, Response, NextFunction } from "express";

import { authService } from "../services/auth.service";
import { tokenRevocationService } from "../services/token-revocation.service";
import {
    signupSchema,
    loginSchema,
} from "../validation/auth.schema";

export class AuthController {
    signUp = async (
        req: Request,
        res: Response,
        next: NextFunction
    ) => {
        try {
            const input = signupSchema.parse(req.body);

            const result = await authService.signUp(input);

            res.status(201).json(result);
        } catch (error) {
            next(error);
        }
    };

    login = async (
        req: Request,
        res: Response,
        next: NextFunction
    ) => {
        try {
            const input = loginSchema.parse(req.body);

            const result = await authService.login(input);

            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    };

    logout = async (
        req: Request,
        res: Response,
        next: NextFunction
    ) => {
        try {
            const authHeader = req.headers.authorization;
            const token = authHeader?.startsWith("Bearer ") ? authHeader.split(" ")[1] : undefined;
            if (token) {
                tokenRevocationService.revokeToken(token, req.user);
            }

            res.status(200).json({
                message: "Logged out successfully. Token revoked.",
            });
        } catch (error) {
            next(error);
        }
    };

    me = async (
        req: Request,
        res: Response,
        next: NextFunction
    ) => {
        try {
            const userId = req.user.userId;

            const user = await authService.me(userId);

            res.status(200).json(user);
        } catch (error) {
            next(error);
        }
    };
}

export const authController = new AuthController();
