import { z } from "zod";

export const createBookingSchema = z.object({
    tripId: z.string().cuid(),
    seatIds: z.array(z.string().cuid()).min(1),
});

export type CreateBookingInput =
    z.infer<typeof createBookingSchema>;