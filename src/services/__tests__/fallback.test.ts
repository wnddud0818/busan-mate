jest.mock("../weather-service", () => ({
  fetchWeatherSnapshot: jest.fn().mockResolvedValue({
    status: "unavailable",
    source: "fallback",
    date: "2026-04-16",
    signal: "mixed",
    summary: {
      ko: "날씨 예보를 불러오지 못해 중립 경로로 추천했어요.",
      en: "Forecast unavailable, so we used a neutral route.",
    },
  }),
}));

import { generateItinerary } from "../itinerary-service";
import { requiresUpgradeForRemotePublish } from "../publish-service";

describe("service fallbacks", () => {
  it("uses local fallback when remote integrations are unavailable", async () => {
    const result = await generateItinerary({
      tripDays: 1,
      totalBudgetKrw: 120000,
      partySize: 2,
      travelDate: "2026-04-16",
      startAreaId: "seomyeon",
      companionType: "friends",
      interests: ["food", "night"],
      budgetLevel: "balanced",
      mobilityMode: "mixed",
      accessibilityNeeds: false,
      indoorFallback: true,
      locale: "ko",
    });

    expect(result.usedFallback).toBe(true);
    expect(result.itinerary.days.length).toBe(1);
    expect(result.warnings.join(" ")).toContain("중립");
    expect(result.itinerary.planningMeta.debug?.engine).toBe("local-fallback");
    expect(result.itinerary.planningMeta.debug?.candidatePlaces.length).toBeGreaterThan(0);
  });

  it("adds a fallback lodging estimate for overnight trips without live stay pricing", async () => {
    const result = await generateItinerary({
      tripDays: 2,
      totalBudgetKrw: 320000,
      partySize: 2,
      travelDate: "2026-04-16",
      startAreaId: "seomyeon",
      companionType: "friends",
      interests: ["food", "night"],
      budgetLevel: "balanced",
      mobilityMode: "mixed",
      accessibilityNeeds: false,
      indoorFallback: true,
      locale: "ko",
    });

    expect(result.itinerary.planningMeta.lodging?.source).toBe("fallback");
    expect(result.itinerary.planningMeta.lodging?.nights).toBe(1);
    expect(result.itinerary.planningMeta.lodging?.estimatedTotalKrw).toBeGreaterThan(0);
  });

  it("requires upgrade for anonymous remote publishing", () => {
    expect(
      requiresUpgradeForRemotePublish({
        userProfile: {
          id: "guest-1",
          isAnonymous: true,
          authMode: "supabase",
        },
        remoteEnabled: true,
      })
    ).toBe(true);
  });
});
