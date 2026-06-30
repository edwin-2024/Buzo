import type { Request, Response, NextFunction } from "express";

import { authService } from "../services/auth.service";
import {
    signupSchema,
    loginSchema,
} from "../validation/auth.schema";

export class AuthController {
    async signUp(
        req: Request,
        res: Response,
        next: NextFunction
    ) {
        try {
            const input = signupSchema.parse(req.body);

            const result = await authService.signUp(input);

            res.status(201).json(result);
        } catch (error) {
            next(error);
        }
    }

    async login(
        req: Request,
        res: Response,
        next: NextFunction
    ) {
        try {
            const input = loginSchema.parse(req.body);

            const result = await authService.login(input);

            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    }

    async me(
        req: Request,
        res: Response,
        next: NextFunction
    ) {
        try {
            const userId = req.user.userId;

            const user = await authService.me(userId);

            res.status(200).json(user);
        } catch (error) {
            next(error);
        }
    }
}

export const authController = new AuthController();