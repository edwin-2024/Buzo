import { prisma } from "@buzo/db";
import type { ToolHandler } from "./types";

export const listStopsHandler: ToolHandler = async () => {
    const stops = await prisma.stop.findMany({
        orderBy: { name: "asc" },
    });
    return stops.map(s => s.name);
};
