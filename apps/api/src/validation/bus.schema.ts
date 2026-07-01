import { z } from "zod";

export const createBusSchema = z.object({
    number: z
        .string()
        .trim()
        .min(2)
        .max(30),

    capacity: z
        .number()
        .int()
        .positive()
        .max(100),
});

export const updateBusSchema = createBusSchema.partial();

export type CreateBusInput = z.infer<typeof createBusSchema>;
export type UpdateBusInput = z.infer<typeof updateBusSchema>;