export const getDestinationWeather = {
    name: "getDestinationWeather",
    description: "Get the current weather for a specific destination stop/city.",
    parameters: {
        type: "object",
        properties: {
            destination: {
                type: "string",
                description: "The name of the destination stop or city (e.g. Majestic, Airport).",
            },
        },
        required: ["destination"],
    },
};
