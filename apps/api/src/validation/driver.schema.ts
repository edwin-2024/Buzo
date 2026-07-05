import { z } from "zod";

export const createDriverSchema = z.object({
    email: z.string().email(),
});

export const assignBusSchema = z.object({
    busId: z.string().cuid(),
});

export type CreateDriverInput =
    z.infer<typeof createDriverSchema>;

export type AssignBusInput =
    z.infer<typeof assignBusSchema>;