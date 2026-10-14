import { Router } from "express";

import { bookingController } from "../controllers/booking.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

router.get("/", bookingController.getAll);

router.get(
    "/me",
    authMiddleware,
    bookingController.getMyBookings
);

router.get("/:id/receipt", authMiddleware, bookingController.getReceipt);
router.post("/:id/receipt/email", authMiddleware, bookingController.emailReceipt);

router.get("/:id", bookingController.getById);

router.post(
    "/",
    authMiddleware,
    bookingController.create
);

router.delete(
    "/:id",
    authMiddleware,
    bookingController.delete
);

export default router;
