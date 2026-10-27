import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import { bookingService } from "../services/booking.service";

const router = Router();

router.post("/create-checkout-session", authMiddleware, async (req, res, next) => {
    try {
        const { tripId } = req.body;
        const passengerId = req.user?.userId;

        if (!tripId || !passengerId) {
            return res.status(400).json({ error: "Missing tripId or authentication" });
        }

        // Validate hold window and atomically confirm reservation
        const result = await bookingService.confirmPayment(passengerId, tripId);

        return res.json({ 
            url: "/my-bookings",
            success: true,
            seatIds: result.seatIds,
            message: "Payment confirmed successfully",
        });
        
    } catch (error) {
        next(error);
    }
});

export default router;
