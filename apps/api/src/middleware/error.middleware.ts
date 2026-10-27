import type { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";

export function errorHandler(
    err: any,
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

    // 2. Prisma known request errors
    if (err?.code === "P2002") {
        return res.status(409).json({
            message: "A unique constraint violation occurred",
            fields: err.meta?.target,
        });
    }

    if (err?.code === "P2025") {
        return res.status(404).json({
            message: "Record not found",
        });
    }

    // 3. Known domain / service errors
    const errorMessage = typeof err === "string" ? err : err?.message || "Internal server error";
    const statusCode = err?.statusCode || err?.status || (
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
