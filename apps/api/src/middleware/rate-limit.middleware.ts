import rateLimit from "express-rate-limit";

// Rate limiter for authentication endpoints (/api/auth/login, /api/auth/signup)
// Mitigates credential stuffing, brute force password guessing, and account enumeration
export const authRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: process.env.NODE_ENV === "test" ? 1000 : 10, // 10 attempts per 15 min window
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: {
        message: "Too many authentication attempts. Please try again after 15 minutes.",
    },
});

// Rate limiter for AI Chat endpoint (/api/chat)
// Mitigates LLM quota exhaustion, runaway token bills, and Denial of Service
export const chatRateLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    limit: process.env.NODE_ENV === "test" ? 1000 : 30, // 30 requests per minute
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: {
        message: "Too many AI assistant requests. Please wait a moment before sending more messages.",
    },
});

// General API protection limiter across all routes
export const apiGeneralLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: process.env.NODE_ENV === "test" ? 5000 : 500, // 500 requests per 15 minutes
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: {
        message: "Too many requests from this IP. Please slow down.",
    },
});
