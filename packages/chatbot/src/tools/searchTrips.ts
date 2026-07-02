export const searchTripsTool = {
    name: "searchTrips",
    description:
        "Search for available buses or trips between two stops. Use this when the user asks about buses, trips, routes, or travel options from one place to another.",

    parameters: {
        type: "object",

        properties: {
            origin: {
                type: "string",
                description:
                    "The departure stop name",
            },

            destination: {
                type: "string",
                description:
                    "The arrival stop name",
            },

            date: {
                type: "string",
                description:
                    "Optional date in YYYY-MM-DD format",
            },
        },

        required: ["origin", "destination"],
    },
};