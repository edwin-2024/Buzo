import { UserRole } from "@buzo/db";

import { userRepository } from "../repositories/user.repository";
import { hashPassword, verifyPassword } from "../lib/password";
import { signToken } from "../lib/jwt";

import {
    type SignUpInput,
    type LoginInput,
} from "../validation/auth.schema";

export class AuthService {
    async signUp(input: SignUpInput) {
        const existingUser = await userRepository.findByEmail(input.email);

        if (existingUser) {
            throw new Error("Email already exists");
        }

        const hashedPassword = await hashPassword(input.password);

        const user = await userRepository.create({
            name: input.name,
            email: input.email,
            password: hashedPassword,
            role: UserRole.PASSENGER,
        });

        const token = signToken({
            userId: user.id,
            role: user.role,
        });

        const { password, ...safeUser } = user;

        return {
            user: safeUser,
            token,
        };
    }

    async login(input: LoginInput) {
        const user = await userRepository.findByEmail(input.email);

        if (!user) {
            throw new Error("Invalid email or password");
        }

        const validPassword = await verifyPassword(
            input.password,
            user.password
        );

        if (!validPassword) {
            throw new Error("Invalid email or password");
        }

        const token = signToken({
            userId: user.id,
            role: user.role,
        });

        const { password, ...safeUser } = user;

        return {
            user: safeUser,
            token,
        };
    }

    async me(userId: string) {
        const user = await userRepository.findById(userId);

        if (!user) {
            throw new Error("User not found");
        }

        const { password, ...safeUser } = user;

        return safeUser;
    }
}

export const authService = new AuthService();