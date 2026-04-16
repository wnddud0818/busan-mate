import { buildFallbackItinerary } from "../../itinerary/planner";
import { buildGuideAnswer } from "../answerer";

describe("guide answerer", () => {
  it("answers story questions from stop context", () => {
    const itinerary = buildFallbackItinerary({
      tripDays: 1,
      totalBudgetKrw: 120000,
      partySize: 1,
      travelDate: "2026-04-16",
      startAreaId: "nampo",
      companionType: "solo",
      interests: ["history", "culture"],
      budgetLevel: "balanced",
      mobilityMode: "mixed",
      accessibilityNeeds: false,
      indoorFallback: true,
      includeLodgingCost: true,
      locale: "ko",
    });

    const stop = itinerary.days[0]!.stops[0]!;
    const answer = buildGuideAnswer("이 장소 설명해줘", {
      itinerary,
      stop,
      locale: "ko",
    });

    expect(answer.answer.length).toBeGreaterThan(10);
  });
});
