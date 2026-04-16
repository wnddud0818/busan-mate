import {
  crowdForecastLevelForRate,
  findStopCrowdForecast,
  resolveCrowdForecastDistrictCode,
} from "../crowd-service";
import { ItineraryStop } from "../../types/domain";

const makeStop = (overrides: Partial<ItineraryStop> = {}): ItineraryStop => ({
  id: "stop-1",
  order: 1,
  date: "2026-04-16",
  startTime: "10:00",
  endTime: "11:00",
  highlight: {
    ko: "\uD3EC\uD1A0 \uC2A4\uD31F",
    en: "Photo stop",
  },
  note: {
    ko: "\uC5EC\uC720 \uC0B0\uCC45",
    en: "Slow walk",
  },
  place: {
    id: "jagalchi",
    slug: "jagalchi-market",
    district: "Jung-gu",
    categories: ["food", "culture", "history"],
    name: {
      ko: "\uC790\uAC08\uCE58\uC2DC\uC7A5",
      en: "Jagalchi Market",
    },
    description: {
      ko: "\uBD80\uC0B0 \uB300\uD45C \uC2DC\uC7A5",
      en: "A signature seafood market in Busan.",
    },
    signatureStory: {
      ko: "\uD56D\uAD6C \uBB38\uD654\uAC00 \uB0A8\uC544 \uC788\uB294 \uACF3",
      en: "A market rooted in Busan port culture.",
    },
    coordinates: {
      latitude: 35.0968,
      longitude: 129.0307,
    },
    indoor: true,
    accessibility: true,
    recommendedStayMinutes: 60,
    popularity: 90,
    crowdBase: 84,
    priceLevel: "balanced",
    estimatedSpendKrw: 22000,
  },
  ...overrides,
});

describe("crowd service helpers", () => {
  it("resolves a district code from the place id or district label", () => {
    expect(resolveCrowdForecastDistrictCode(makeStop().place)).toBe("26110");
    expect(
      resolveCrowdForecastDistrictCode({
        ...makeStop().place,
        id: "tour-1",
        district: "\uD574\uC6B4\uB300\uAD6C",
        name: {
          ko: "\uD574\uC6B4\uB300\uD574\uC218\uC695\uC7A5",
          en: "Haeundae Beach",
        },
      })
    ).toBe("26350");
  });

  it("matches an aliased VisitKorea attraction name to the stop", () => {
    const match = findStopCrowdForecast({
      stop: makeStop(),
      districtCode: "26110",
      rows: [
        {
          baseYmd: "20260416",
          signguCd: "26110",
          signguNm: "\uC911\uAD6C",
          tAtsNm: "\uBD80\uC0B0 \uC790\uAC08\uCE58\uC2DC\uC7A5",
          cnctrRate: 49.53,
        },
      ],
    });

    expect(match).toMatchObject({
      stopId: "stop-1",
      placeId: "jagalchi",
      matchedAttractionName: "\uBD80\uC0B0 \uC790\uAC08\uCE58\uC2DC\uC7A5",
      districtCode: "26110",
      districtName: "\uC911\uAD6C",
      rate: 49.53,
      level: "moderate",
    });
  });

  it("supports proxy aliases like Huinnyeoul to the coastal tunnel dataset entry", () => {
    const match = findStopCrowdForecast({
      stop: makeStop({
        id: "stop-2",
        place: {
          ...makeStop().place,
          id: "huinnyeoul",
          slug: "huinnyeoul-culture-village",
          district: "Yeongdo-gu",
          name: {
            ko: "\uD770\uC5EC\uC6B8\uBB38\uD654\uB9C8\uC744",
            en: "Huinnyeoul Culture Village",
          },
        },
      }),
      districtCode: "26200",
      rows: [
        {
          baseYmd: "20260416",
          signguCd: "26200",
          signguNm: "\uC601\uB3C4\uAD6C",
          tAtsNm: "\uC601\uB3C4 \uD770\uC5EC\uC6B8\uD574\uC548\uD130\uB110",
          cnctrRate: 31.2,
        },
      ],
    });

    expect(match?.matchedAttractionName).toBe("\uC601\uB3C4 \uD770\uC5EC\uC6B8\uD574\uC548\uD130\uB110");
    expect(match?.level).toBe("low");
  });

  it("classifies low, moderate, and high rates consistently", () => {
    expect(crowdForecastLevelForRate(25)).toBe("low");
    expect(crowdForecastLevelForRate(55)).toBe("moderate");
    expect(crowdForecastLevelForRate(72)).toBe("high");
  });
});
