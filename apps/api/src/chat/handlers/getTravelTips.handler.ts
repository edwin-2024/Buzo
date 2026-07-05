import type { ToolHandler } from "./types";

export const getTravelTipsHandler: ToolHandler = async (args) => {
    const destination = args.destination as string;
    
    // Mock local travel tips
    const tips = [
        "Be sure to carry an umbrella, as evening showers are common.",
        "The local metro connects right from the bus stop to the city center.",
        "Traffic peaks around 6 PM, so plan your onward journey accordingly.",
        "Try the local street food near the main stop, it's highly rated!",
        "Keep digital payment methods handy, though some small vendors only take cash."
    ];
    
    const hash = destination.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
    
    // Return 2 random tips based on destination hash
    const tip1 = tips[hash % tips.length];
    const tip2 = tips[(hash + 2) % tips.length];
    
    return {
        destination,
        tips: [tip1, tip2],
        message: `Here are some travel tips for ${destination}:\n- ${tip1}\n- ${tip2}`
    };
};
