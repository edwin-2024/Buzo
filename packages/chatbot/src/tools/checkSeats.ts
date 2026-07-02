export const checkSeatsTool = {
    name: "checkSeats",

    description:
        "Get available seats for a trip.",

    parameters: {
        type: "object",

        properties: {
            tripId: {
                type: "string",
            },
        },

        required: ["tripId"],
    },
};