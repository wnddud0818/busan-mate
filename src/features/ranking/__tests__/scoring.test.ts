import { materializeRanking } from "../scoring";

describe("ranking", () => {
  it("falls back to seeded ranking when no shared routes exist", () => {
    const rankings = materializeRanking([], []);
    expect(rankings.length).toBeGreaterThan(0);
  });
});
