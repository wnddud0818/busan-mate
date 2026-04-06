import { generateItinerary } from "../itinerary-service";
import { requiresUpgradeForRemotePublish } from "../publish-service";

describe("service fallbacks", () => {
  it("uses local fallback when remote integrations are unavailable", async () => {
    const result = await generateItinerary({
      tripDays: 1,
      companionType: "friends",
      interests: ["food", "night"],
      budgetLevel: "balanced",
      mobilityMode: "mixed",
      accessibilityNeeds: false,
      indoorFallback: true,
      locale: "ko",
      startDistrict: "Seomyeon",
    });

    expect(result.usedFallback).toBe(true);
    expect(result.itinerary.days.length).toBe(1);
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
