import { materializeRanking } from "../scoring";

describe("ranking", () => {
  it("falls back to seeded ranking when no shared routes exist", () => {
    const rankings = materializeRanking([], []);
    expect(rankings.length).toBeGreaterThan(0);
  });

  it("excludes unsynced shared routes and live events from public rankings", () => {
    const rankings = materializeRanking(
      [
        {
          id: "shared-pending",
          itineraryId: "route-pending",
          title: { ko: "보류", en: "Pending" },
          summary: { ko: "보류", en: "Pending" },
          heroPlaceName: { ko: "보류", en: "Pending" },
          tags: ["food"],
          ratingAverage: 4.5,
          currentTravelers: 12,
          score: 88,
          syncStatus: "pending",
        },
        {
          id: "shared-synced",
          itineraryId: "route-synced",
          title: { ko: "동기화", en: "Synced" },
          summary: { ko: "동기화", en: "Synced" },
          heroPlaceName: { ko: "동기화", en: "Synced" },
          tags: ["culture"],
          ratingAverage: 4.7,
          currentTravelers: 5,
          score: 86,
          syncStatus: "synced",
        },
      ],
      [
        {
          id: "event-failed",
          tripSessionId: "trip-route-synced-1",
          capturedAt: "2026-04-15T10:00:00.000Z",
          geohash: null,
          consented: true,
          syncStatus: "failed",
        },
      ]
    );

    expect(rankings).toHaveLength(1);
    expect(rankings[0]?.itineraryId).toBe("route-synced");
    expect(rankings[0]?.currentTravelers).toBe(5);
  });
});
