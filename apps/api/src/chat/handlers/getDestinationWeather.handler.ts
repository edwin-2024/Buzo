import type { ToolHandler } from "./types";
import { prisma } from "@buzo/db";

// Map WMO weather codes to readable text
function getWeatherDescription(code: number): string {
    if (code === 0) return "Clear sky";
    if (code >= 1 && code <= 3) return "Partly cloudy";
    if (code === 45 || code === 48) return "Foggy";
    if (code >= 51 && code <= 55) return "Drizzling";
    if (code >= 61 && code <= 65) return "Raining";
    if (code >= 71 && code <= 75) return "Snowing";
    if (code >= 80 && code <= 82) return "Rain showers";
    if (code >= 95) return "Thunderstorms";
    return "Unknown weather";
}

export const getDestinationWeatherHandler: ToolHandler = async (args) => {
    const destination = args.destination as string;
    
    let lat: number | undefined;
    let lon: number | undefined;
    let resolvedName = destination;

    // 1. Try to find coordinates in our database
    const stop = await prisma.stop.findFirst({
        where: {
            name: {
                contains: destination,
                mode: "insensitive"
            }
        }
    });

    if (stop) {
        lat = stop.latitude;
        lon = stop.longitude;
        resolvedName = stop.name;
    } else {
        // 2. Fallback to Open-Meteo Geocoding API if not a known stop
        try {
            // Open-Meteo geocoding doesn't map Bangalore to Bengaluru automatically
            let searchTerm = destination;
            if (searchTerm.toLowerCase() === "bangalore") {
                searchTerm = "Bengaluru";
            }
            
            const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(searchTerm)}&count=5`);
            const geoData = await geoRes.json();
            
            if (geoData.results && geoData.results.length > 0) {
                // Try to find an Indian city first, otherwise fallback to the first result
                const bestResult = geoData.results.find((r: any) => r.country_code === "IN") || geoData.results[0];
                lat = bestResult.latitude;
                lon = bestResult.longitude;
                resolvedName = bestResult.name;
            }
        } catch (e) {
            console.error("Geocoding failed", e);
        }
    }

    if (!lat || !lon) {
        return {
            error: `Could not find geographical coordinates for destination: ${destination}.`
        };
    }

    // 3. Fetch real weather data
    try {
        const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`);
        const weatherData = await weatherRes.json();
        
        const current = weatherData.current_weather;
        if (!current) {
            return { error: "Weather data currently unavailable." };
        }

        const condition = getWeatherDescription(current.weathercode);
        const temp = current.temperature;
        
        return {
            destination: resolvedName,
            weather: condition,
            temperature: `${temp}°C`,
            message: `The current weather in ${resolvedName} is ${condition.toLowerCase()} with a temperature of ${temp}°C.`
        };
    } catch (e) {
        console.error("Weather API failed", e);
        return { error: "Failed to fetch weather data at this time." };
    }
};
