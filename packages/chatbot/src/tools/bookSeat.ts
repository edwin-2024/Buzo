import { Type } from "@google/genai";

export const bookSeatTool = {
    name: "bookSeat",
    description: "Book a seat for a trip.",
    parameters: {
        type: Type.OBJECT,
        properties: {
            tripId: {
                type: Type.STRING,
            },

            seatId: {
                type: Type.STRING,
            },
        },

        required: [
            "tripId",
            "seatId",
        ],
    },
};