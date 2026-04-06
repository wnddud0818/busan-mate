import { createLocationEvent, shouldTriggerDepartureAlert } from "../guidance";

describe("guidance", () => {
  it("triggers departure alert when user is late and far away", () => {
    expect(
      shouldTriggerDepartureAlert({
        distanceToCurrentStopMeters: 400,
        minutesUntilNextStop: 10,
        nowIso: "2026-04-06T09:00:00.000Z",
      })
    ).toBe(true);
  });

  it("hashes location when consent is granted", () => {
    const event = createLocationEvent({
      session: {
        id: "trip-123",
        itineraryId: "itinerary-1",
        currentDay: 1,
        currentStopOrder: 1,
        startedAt: "2026-04-06T09:00:00.000Z",
        status: "active",
        locationConsent: true,
        locale: "ko",
      },
      coordinates: {
        latitude: 35.1796,
        longitude: 129.0756,
      },
      consented: true,
    });
    expect(event.geohash).toBeTruthy();
  });
});
