export const bookSeatTool = {
    name: "bookSeat",
    description: "Book seats for a trip using natural language constraints.",
    parameters: {
        type: "object",
        properties: {
            origin: { type: "string", description: "Departure city or stop" },
            destination: { type: "string", description: "Arrival city or stop" },
            date: { type: "string", description: "Optional date in YYYY-MM-DD format" },
            numberOfSeats: { type: "number", description: "Number of seats to book (default 1)" },
            position: { type: "string", description: "Preferred position (front, middle, back)" },
            sideBySide: { type: "boolean", description: "Whether the seats should be adjacent" },
        },
        required: ["origin", "destination", "numberOfSeats"],
    },
};