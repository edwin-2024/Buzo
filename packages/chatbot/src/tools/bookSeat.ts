export const bookSeatTool = {
    name: "bookSeat",
    description: "Book a seat for a trip.",
    parameters: {
        type: "object",
        properties: {
            tripId: {
                type: "string",
            },

            seatId: {
                type: "string",
            },
        },

        required: [
            "tripId",
            "seatId",
        ],
    },
};