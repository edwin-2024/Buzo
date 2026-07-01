import { Type } from "@google/genai";

export const trackBusTool = {
    name: "trackBus",

    description:
        "Track the live location of a bus.",

    parameters: {
        type: Type.OBJECT,

        properties: {
            busNumber: {
                type: Type.STRING,
            },
        },

        required: ["busNumber"],
    },
};