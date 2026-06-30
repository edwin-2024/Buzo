import { z } from "zod";

export const createStopSchema = z.object({
    name: z
        .string()
        .trim()
        .min(2)
        .max(100),

    latitude: z
        .number()
        .min(-90)
        .max(90),

    longitude: z
        .number()
        .min(-180)
        .max(180),
});

export const updateStopSchema = createStopSchema.partial();

export type CreateStopInput = z.infer<typeof createStopSchema>;
export type UpdateStopInput = z.infer<typeof updateStopSchema>;