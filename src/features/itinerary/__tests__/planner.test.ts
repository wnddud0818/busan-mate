import { seedPlaces } from "../../../data/seed";
import { TripPreferences } from "../../../types/domain";
import { buildFallbackItinerary, scorePlaces, validateStructuredItinerary } from "../planner";

const preferences: TripPreferences = {
  tripDays: 2,
  companionType: "friends",
  interests: ["food", "culture", "night"],
  budgetLevel: "balanced",
  mobilityMode: "mixed",
  accessibilityNeeds: false,
  indoorFallback: true,
  locale: "ko",
  startDistrict: "Seomyeon",
};

describe("planner", () => {
  it("scores places according to preferences", () => {
    const ranked = scorePlaces(preferences, seedPlaces);
    expect(ranked[0]?.score).toBeGreaterThan(ranked[ranked.length - 1]?.score ?? 0);
  });

  it("builds a fallback itinerary that passes validation", () => {
    const itinerary = buildFallbackItinerary(preferences, seedPlaces);
    const result = validateStructuredItinerary(itinerary);
    expect(result.success).toBe(true);
    expect(itinerary.days).toHaveLength(2);
  });
});
