import { seedPlaces } from "../../../data/seed";
import { TripPreferences } from "../../../types/domain";
import { buildFallbackItinerary, scorePlaces, validateStructuredItinerary } from "../planner";

const preferences: TripPreferences = {
  tripDays: 2,
  totalBudgetKrw: 240000,
  partySize: 2,
  travelDate: "2026-04-16",
  startAreaId: "seomyeon",
  companionType: "friends",
  interests: ["food", "culture", "night"],
  budgetLevel: "balanced",
  mobilityMode: "mixed",
  accessibilityNeeds: false,
  indoorFallback: true,
  locale: "ko",
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
    expect(itinerary.planningMeta.debug?.candidatePlaces.length).toBeGreaterThan(0);
    expect(itinerary.planningMeta.debug?.routeLegs.length).toBeGreaterThan(0);
  });

  it("keeps the generated route within the total budget when possible", () => {
    const itinerary = buildFallbackItinerary(preferences, seedPlaces);
    expect(itinerary.planningMeta.budgetSummary.estimatedTotalKrw).toBeLessThanOrEqual(
      preferences.totalBudgetKrw
    );
  });

  it("increases estimated total cost when party size grows", () => {
    const itineraryForTwo = buildFallbackItinerary(preferences, seedPlaces);
    const itineraryForFour = buildFallbackItinerary(
      {
        ...preferences,
        partySize: 4,
        totalBudgetKrw: 480000,
      },
      seedPlaces
    );

    expect(itineraryForFour.planningMeta.budgetSummary.estimatedTotalKrw).toBeGreaterThan(
      itineraryForTwo.planningMeta.budgetSummary.estimatedTotalKrw
    );
  });

  it("favors indoor places when rain is expected", () => {
    const rainy = buildFallbackItinerary(preferences, seedPlaces, {
      weatherSnapshot: {
        status: "live",
        source: "open-meteo",
        date: preferences.travelDate,
        signal: "rainy",
        summary: {
          ko: "비 예보로 실내 비중을 높였어요.",
          en: "Rain is expected, so we shifted the route indoors.",
        },
      },
    });

    const indoorStops = rainy.days.flatMap((day) => day.stops).filter((stop) => stop.place.indoor);
    expect(indoorStops.length).toBeGreaterThan(0);
  });

  it("keeps food and night routes running into lunch and evening slots", () => {
    const itinerary = buildFallbackItinerary(preferences, seedPlaces);
    const allStops = itinerary.days.flatMap((day) => day.stops);
    const hasLunchSlot = allStops.some((stop) => {
      const time = stop.startTime.slice(11, 16);
      return time >= "12:30" && time <= "13:30";
    });
    const hasEveningStop = allStops.some((stop) => stop.startTime.slice(11, 16) >= "18:30");
    const latestEndTime = allStops.reduce(
      (latest, stop) => (stop.endTime.slice(11, 16) > latest ? stop.endTime.slice(11, 16) : latest),
      "00:00"
    );

    expect(hasLunchSlot).toBe(true);
    expect(hasEveningStop).toBe(true);
    expect(latestEndTime >= "20:00").toBe(true);
  });
});
