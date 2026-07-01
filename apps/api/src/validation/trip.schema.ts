import { TripStatus } from "@buzo/db";
import { z } from "zod";

export const createTripSchema = z.object({
    busId: z.string().cuid(),

    routeId: z.string().cuid(),

    departureTime: z.coerce.date(),

    arrivalTime: z.coerce.date(),

    status: z.nativeEnum(TripStatus).default(
        TripStatus.SCHEDULED
    ),
});

export const updateTripSchema =
    createTripSchema.partial();

export type CreateTripInput =
    z.infer<typeof createTripSchema>;

export type UpdateTripInput =
    z.infer<typeof updateTripSchema>;