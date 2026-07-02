export const checkSeatsTool = {
    name: "checkSeats",
    description: "Check available seats for a trip between two stops.",
    parameters: {
        type: "object",
        properties: {
            origin: { type: "string", description: "Departure city or stop" },
            destination: { type: "string", description: "Arrival city or stop" },
        },
        required: ["origin", "destination"],
    },
};