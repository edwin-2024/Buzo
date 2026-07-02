export const trackBusTool = {
    name: "trackBus",

    description:
        "Track the live location of a bus.",

    parameters: {
        type: "object",

        properties: {
            busNumber: {
                type: "string",
            },
        },

        required: ["busNumber"],
    },
};