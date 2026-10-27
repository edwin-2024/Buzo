import type { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";

export class AppError extends Error {
    constructor(public statusCode: number, message: string) {
        super(message);
        this.name = "AppError";
    }
}

export function errorHandler(
    err: unknown,
    _req: Request,
    res: Response,
    _next: NextFunction
) {
    // 1. Zod schema validation errors
    if (err instanceof ZodError) {
        const issues = err.issues || (err as any).errors || [];
        return res.status(400).json({
            message: "Validation failed",
            errors: issues.map((e: any) => ({
                path: Array.isArray(e.path) ? e.path.join(".") : String(e.path),
                message: e.message,
            })),
        });
    }

    // 2. Explicit AppError instances
    if (err instanceof AppError) {
        return res.status(err.statusCode).json({
            message: err.message,
        });
    }

    // 3. Prisma known request errors
    const errorRecord = err as { code?: string; meta?: { target?: unknown }; message?: string; statusCode?: number; status?: number };
    if (errorRecord?.code === "P2002") {
        return res.status(409).json({
            message: "A unique constraint violation occurred",
            fields: errorRecord.meta?.target,
        });
    }

    if (errorRecord?.code === "P2025") {
        return res.status(404).json({
            message: "Record not found",
        });
    }

    // 4. Known domain / service errors
    const errorMessage = typeof err === "string" ? err : errorRecord?.message || "Internal server error";
    const statusCode = errorRecord?.statusCode || errorRecord?.status || (
        errorMessage.toLowerCase().includes("not found") ? 404 :
        errorMessage.toLowerCase().includes("already booked") ||
        errorMessage.toLowerCase().includes("no longer available") ||
        errorMessage.toLowerCase().includes("already reserved") ? 409 :
        errorMessage.toLowerCase().includes("expired") ? 410 :
        errorMessage.toLowerCase().includes("forbidden") || errorMessage.toLowerCase().includes("permission") ? 403 :
        errorMessage.toLowerCase().includes("unauthorized") || errorMessage.toLowerCase().includes("authentication required") ? 401 :
        500
    );

    if (statusCode === 500) {
        console.error("Unhandled API error:", err);
    }

    return res.status(statusCode).json({
        message: errorMessage,
    });
}
