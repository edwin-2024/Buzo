import { Type } from "@google/genai";

export const checkSeatsTool = {
    name: "checkSeats",

    description:
        "Get available seats for a trip.",

    parameters: {
        type: Type.OBJECT,

        properties: {
            tripId: {
                type: Type.STRING,
            },
        },

        required: ["tripId"],
    },
};