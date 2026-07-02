import { prisma } from "@buzo/db";

import type { ToolHandler } from "./types";

export const listRoutesHandler: ToolHandler = async () => {
    const routes = await prisma.route.findMany({
        include: {
            stops: {
                include: { stop: true },
                orderBy: { order: "asc" },
            },
        },
    });

    return routes.map((r) => ({
        name: r.name,
        stops: r.stops.map((s) => s.stop.name).join(" → "),
    }));
};
