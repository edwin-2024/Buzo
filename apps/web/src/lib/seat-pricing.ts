export type SeatTierKey =
  | "PREMIUM_FRONT_WINDOW"
  | "PREMIUM_FRONT_AISLE"
  | "STANDARD_WINDOW"
  | "STANDARD_AISLE";

export interface SeatPricingTier {
  tier: SeatTierKey;
  name: string;
  price: number;
  perks: string[];
}

export function getSeatTierFallback(seatNumber: number): SeatPricingTier {
  const isFrontRow = seatNumber >= 1 && seatNumber <= 8;
  const mod = seatNumber % 4;
  const isWindow = mod === 1 || mod === 0;

  if (isFrontRow) {
    if (isWindow) {
      return {
        tier: "PREMIUM_FRONT_WINDOW",
        name: "Premium Front Window",
        price: 749,
        perks: [
          "Extra legroom",
          "Panoramic front window view",
          "Priority deboarding",
        ],
      };
    }
    return {
      tier: "PREMIUM_FRONT_AISLE",
      name: "Premium Front Aisle",
      price: 699,
      perks: ["Extra legroom", "Quick exit"],
    };
  }

  if (isWindow) {
    return {
      tier: "STANDARD_WINDOW",
      name: "Standard Window",
      price: 649,
      perks: ["Window view"],
    };
  }

  return {
    tier: "STANDARD_AISLE",
    name: "Standard Aisle",
    price: 599,
    perks: ["Standard comfortable seat"],
  };
}

export function resolveSeatPricing(seat: any, seatNumber: number): SeatPricingTier {
  const fallback = getSeatTierFallback(seatNumber);
  return {
    tier: (seat?.tier as SeatTierKey) || fallback.tier,
    name: seat?.tierName || fallback.name,
    price: typeof seat?.price === "number" ? seat.price : fallback.price,
    perks: Array.isArray(seat?.perks) && seat.perks.length > 0 ? seat.perks : fallback.perks,
  };
}
