import { Type } from "@google/genai";

export const searchTripsTool = {
    name: "searchTrips",
    description:
        "Search for available buses or trips between two stops. Use this when the user asks about buses, trips, routes, or travel options from one place to another.",

    parameters: {
        type: Type.OBJECT,

        properties: {
            origin: {
                type: Type.STRING,
                description:
                    "The departure stop name",
            },

            destination: {
                type: Type.STRING,
                description:
                    "The arrival stop name",
            },

            date: {
                type: Type.STRING,
                description:
                    "Optional date in YYYY-MM-DD format",
            },
        },

        required: ["origin", "destination"],
    },
};