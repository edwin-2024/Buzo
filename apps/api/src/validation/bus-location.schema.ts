import { z } from "zod";

export const updateBusLocationSchema = z.object({
    latitude: z.number(),
    longitude: z.number(),

    heading: z.number(),

    speed: z.number().min(0),
});

export type UpdateBusLocationInput =
    z.infer<typeof updateBusLocationSchema>;