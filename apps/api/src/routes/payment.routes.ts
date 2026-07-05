import { Router } from "express";
import { prisma } from "@buzo/db";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

router.post("/create-checkout-session", authMiddleware, async (req, res) => {
    try {
        const { tripId } = req.body;
        const passengerId = req.user?.userId;

        if (!tripId || !passengerId) {
            return res.status(400).json({ error: "Missing tripId or authentication" });
        }

        // Mock Stripe checkout session creation
        // We will just instantly update all pending bookings for this trip/user to PAID
        
        await prisma.booking.updateMany({
            where: {
                tripId: tripId,
                passengerId: passengerId,
                paymentStatus: "PENDING",
            },
            data: {
                paymentStatus: "PAID",
            },
        });

        // Normally we would return a stripe checkout URL here
        // For MVP, return a mock success URL that frontend will redirect to
        return res.json({ 
            url: "/my-bookings",
            success: true 
        });
        
    } catch (error) {
        console.error("Payment error:", error);
        return res.status(500).json({ error: "Failed to create checkout session" });
    }
});

export default router;
