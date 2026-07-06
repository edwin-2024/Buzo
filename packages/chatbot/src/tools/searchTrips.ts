export const searchTripsTool = {
    name: "searchTrips",
    description:
        "Search for available buses or trips between two stops. Use this when the user asks about buses, trips, routes, or travel options from one place to another. IMPORTANT: The system requires exact matches for stop names. If this returns an empty array, you MUST use the listStops tool to verify the correct spelling of the origin and destination stops, and then call this tool again with the corrected names.",

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