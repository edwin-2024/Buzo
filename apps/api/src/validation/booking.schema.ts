import { z } from "zod";

export const createBookingSchema = z.object({
    tripId: z.string().cuid(),
    seatId: z.string().cuid(),
});

export type CreateBookingInput =
    z.infer<typeof createBookingSchema>;