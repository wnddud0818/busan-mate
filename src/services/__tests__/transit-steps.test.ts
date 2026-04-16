import { buildFallbackTransitSteps, buildOdsayTransitSteps } from "../../features/itinerary/transit-steps";

describe("transit step helpers", () => {
  it("builds readable fallback step details", () => {
    const steps = buildFallbackTransitSteps({
      distanceKm: 4.2,
      durationMinutes: 28,
      mobilityMode: "mixed",
    });

    expect(steps).toHaveLength(2);
    expect(steps[0]).toMatchObject({
      mode: "metro",
      label: {
        en: "Recommended metro transfer",
      },
      detail: {
        en: "28 min / 4.2 km",
      },
    });
  });

  it("returns a driving step when car mode is selected", () => {
    const steps = buildFallbackTransitSteps({
      distanceKm: 6.5,
      durationMinutes: 34,
      mobilityMode: "car",
    });

    expect(steps).toHaveLength(1);
    expect(steps[0]).toMatchObject({
      mode: "car",
      label: {
        en: "Drive",
      },
      detail: {
        en: "34 min / 6.5 km",
      },
    });
  });

  it("turns ODsay sub-paths into detailed route steps", () => {
    const steps = buildOdsayTransitSteps([
      {
        trafficType: 3,
        sectionTime: 6,
        distance: 450,
        startName: "Hotel",
        endName: "Seomyeon Station",
      },
      {
        trafficType: 1,
        sectionTime: 22,
        distance: 7800,
        stationCount: 10,
        startName: "Seomyeon",
        endName: "Haeundae",
        lane: [{ name: "Line 2" }],
      },
      {
        trafficType: 2,
        sectionTime: 12,
        distance: 3100,
        stationCount: 5,
        startName: "Haeundae",
        endName: "Museum",
        lane: [{ busNo: "1003" }],
      },
    ]);

    expect(steps).toHaveLength(3);
    expect(steps[0]).toMatchObject({
      mode: "walk",
      label: {
        en: "Walk Hotel to Seomyeon Station",
      },
      detail: {
        en: "6 min / 0.5 km",
      },
    });
    expect(steps[1]).toMatchObject({
      mode: "metro",
      label: {
        en: "Line 2 from Seomyeon to Haeundae",
      },
      detail: {
        en: "22 min / 7.8 km / 10 stations",
      },
    });
    expect(steps[2]).toMatchObject({
      mode: "bus",
      label: {
        en: "Bus 1003 from Haeundae to Museum",
      },
      detail: {
        en: "12 min / 3.1 km / 5 stops",
      },
    });
  });
});
