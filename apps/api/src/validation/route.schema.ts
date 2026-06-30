import { z } from "zod";

export const routeStopSchema = z.object({
    stopId: z.string().cuid(),

    order: z
        .number()
        .int()
        .positive(),

    distanceFromStart: z
        .number()
        .min(0),
});

export const createRouteSchema = z.object({
    name: z
        .string()
        .trim()
        .min(2)
        .max(100),

    stops: z
        .array(routeStopSchema)
        .min(2, "A route must contain at least two stops"),
});

export const updateRouteSchema =
    createRouteSchema.partial();

export type CreateRouteInput =
    z.infer<typeof createRouteSchema>;

export type UpdateRouteInput =
    z.infer<typeof updateRouteSchema>;