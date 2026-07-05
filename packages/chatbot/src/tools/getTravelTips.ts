export const getTravelTips = {
    name: "getTravelTips",
    description: "Get useful travel tips and local information for a destination.",
    parameters: {
        type: "object",
        properties: {
            destination: {
                type: "string",
                description: "The destination stop or city.",
            },
        },
        required: ["destination"],
    },
};
