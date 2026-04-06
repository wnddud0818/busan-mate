import { buildFallbackItinerary } from "../../itinerary/planner";
import { buildGuideAnswer } from "../answerer";

describe("guide answerer", () => {
  it("answers story questions from stop context", () => {
    const itinerary = buildFallbackItinerary({
      tripDays: 1,
      companionType: "solo",
      interests: ["history", "culture"],
      budgetLevel: "balanced",
      mobilityMode: "mixed",
      accessibilityNeeds: false,
      indoorFallback: true,
      locale: "ko",
      startDistrict: "Nampo",
    });

    const stop = itinerary.days[0]!.stops[0]!;
    const answer = buildGuideAnswer("왜 유명해?", {
      itinerary,
      stop,
      locale: "ko",
    });

    expect(answer.answer.length).toBeGreaterThan(10);
  });
});
