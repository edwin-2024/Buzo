import { z } from "zod";

export const createBookingSchema = z.object({
    tripId: z.string().cuid(),
    seatIds: z
        .array(z.string().cuid())
        .min(1)
        .refine(
            (items) => new Set(items).size === items.length,
            { message: "Duplicate seat IDs are not allowed" }
        ),
});

export type CreateBookingInput =
    z.infer<typeof createBookingSchema>;