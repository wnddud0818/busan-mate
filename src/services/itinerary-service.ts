import { appEnv, hasOdsayApiKey, hasSupabaseConfig, hasTourApiKey } from "../config/env";
import { seedPlaces } from "../data/seed";
import {
  estimatedSpendFromPriceLevel,
  getStartAreaOrDefault,
  normalizeTripPreferences,
} from "../features/itinerary/planning";
import { buildFallbackItinerary, buildTransitLeg, validateStructuredItinerary } from "../features/itinerary/planner";
import { supabase } from "../lib/supabase";
import { AppLocale, GenerateItineraryResponse, Itinerary, Place, TransitLeg, TripPreferences } from "../types/domain";
import { fetchWeatherSnapshot } from "./weather-service";

const mapTourCategory = (contentTypeId?: string) => {
  switch (contentTypeId) {
    case "39":
      return ["food"] as const;
    case "14":
      return ["culture", "history"] as const;
    case "12":
      return ["photospot", "nature"] as const;
    default:
      return ["culture"] as const;
  }
};

const fetchVisitKoreaPlaces = async (): Promise<Place[]> => {
  const params = new URLSearchParams({
    MobileOS: "ETC",
    MobileApp: "BusanMate",
    areaCode: "6",
    numOfRows: "20",
    pageNo: "1",
    _type: "json",
    serviceKey: appEnv.tourApiKey,
  });

  const response = await fetch(
    `https://apis.data.go.kr/B551011/KorService2/areaBasedList2?${params.toString()}`
  );

  if (!response.ok) {
    throw new Error("VisitKorea area list failed");
  }

  const payload = await response.json();
  const items = payload?.response?.body?.items?.item;
  if (!Array.isArray(items)) {
    return [];
  }

  return items
    .filter((item) => item?.mapx && item?.mapy && item?.title)
    .map((item, index) => {
      const categories = [...mapTourCategory(item.contenttypeid)];

      return {
        id: `tour-${item.contentid ?? index}`,
        slug: String(item.title).toLowerCase().replace(/\s+/g, "-"),
        district: item.addr1 ?? "Busan",
        categories,
        name: {
          ko: item.title,
          en: item.title,
        },
        description: {
          ko: item.addr1 ?? "부산 관광 데이터 기반 추천 장소입니다.",
          en: item.addr1 ?? "Recommended from the Korea Tourism public dataset.",
        },
        signatureStory: {
          ko: item.addr1 ?? "공공 관광 데이터에서 불러온 장소입니다.",
          en: item.addr1 ?? "Collected from public tourism data.",
        },
        coordinates: {
          latitude: Number(item.mapy),
          longitude: Number(item.mapx),
        },
        indoor: item.contenttypeid === "14" || item.contenttypeid === "39",
        accessibility: true,
        recommendedStayMinutes: 60,
        popularity: 70 - index,
        crowdBase: 40,
        priceLevel: "balanced",
        estimatedSpendKrw: estimatedSpendFromPriceLevel("balanced", categories),
      };
    });
};

const fetchOdsayTransit = async (
  from: Place,
  to: Place,
  mobilityMode: TripPreferences["mobilityMode"] = "mixed"
): Promise<TransitLeg | null> => {
  const params = new URLSearchParams({
    SX: String(from.coordinates.longitude),
    SY: String(from.coordinates.latitude),
    EX: String(to.coordinates.longitude),
    EY: String(to.coordinates.latitude),
    apiKey: appEnv.odsayApiKey,
  });
  const response = await fetch(`https://api.odsay.com/v1/api/searchPubTransPathT?${params.toString()}`);

  if (!response.ok) {
    return null;
  }

  const payload = await response.json();
  const firstPath = payload?.result?.path?.[0]?.info;
  if (!firstPath) {
    return null;
  }

  const fallbackLeg = buildTransitLeg(from, to, "ko", "odsay", mobilityMode);

  return {
    ...fallbackLeg,
    durationMinutes: firstPath.totalTime ?? fallbackLeg.durationMinutes,
    distanceKm: Number(((firstPath.totalDistance ?? fallbackLeg.distanceKm * 1000) / 1000).toFixed(1)),
    estimatedFareKrw: firstPath.payment ?? fallbackLeg.estimatedFareKrw,
    summary: {
      ko: `${from.name.ko} -> ${to.name.ko} 실시간 대중교통`,
      en: `Live transit from ${from.name.en} to ${to.name.en}`,
    },
  };
};

const enrichTransitLegs = async (itinerary: Itinerary) => {
  if (!hasOdsayApiKey) {
    return itinerary;
  }

  const days = await Promise.all(
    itinerary.days.map(async (day) => {
      const stops = await Promise.all(
        day.stops.map(async (stop, index) => {
          if (index === 0) {
            return stop;
          }

          const previous = day.stops[index - 1];
          const liveTransit = previous
            ? await fetchOdsayTransit(previous.place, stop.place, itinerary.preferences.mobilityMode).catch(
                () => null
              )
            : null;

          return {
            ...stop,
            transitFromPrevious: liveTransit ?? stop.transitFromPrevious,
          };
        })
      );

      return {
        ...day,
        stops,
      };
    })
  );

  return {
    ...itinerary,
    days,
  };
};

const fetchCandidatePlaces = async () => {
  if (!hasTourApiKey) {
    return seedPlaces;
  }

  const livePlaces = await fetchVisitKoreaPlaces().catch(() => []);
  return livePlaces.length > 0 ? [...livePlaces, ...seedPlaces] : seedPlaces;
};

const collectPlanningWarnings = (itinerary: Itinerary) => {
  const warnings: string[] = [];
  const locale = itinerary.locale;

  if (itinerary.planningMeta.weatherSnapshot.status === "unavailable") {
    warnings.push(itinerary.planningMeta.weatherSnapshot.summary[locale]);
  }

  if (itinerary.planningMeta.budgetSummary.strategy === "minimum") {
    warnings.push(itinerary.planningMeta.budgetSummary.summary[locale]);
  }

  return warnings;
};

export const generateItinerary = async (
  preferences: TripPreferences
): Promise<GenerateItineraryResponse> => {
  const normalizedPreferences = normalizeTripPreferences(preferences);
  const warnings: string[] = [];
  const [places, weatherSnapshot] = await Promise.all([
    fetchCandidatePlaces().catch(() => {
      warnings.push("Tour API unavailable, using seeded Busan places.");
      return seedPlaces;
    }),
    fetchWeatherSnapshot({
      startAreaId: normalizedPreferences.startAreaId,
      travelDate: normalizedPreferences.travelDate,
    }),
  ]);

  if (hasSupabaseConfig && supabase) {
    const { data, error } = await supabase.functions.invoke("generate-itinerary", {
      body: {
        preferences: normalizedPreferences,
        places,
        startArea: getStartAreaOrDefault(normalizedPreferences.startAreaId),
        weatherSnapshot,
      },
    });

    if (!error && data) {
      const candidate = validateStructuredItinerary(data.itinerary ?? data);
      if (candidate.success) {
        const remoteItinerary = await enrichTransitLegs({
          ...candidate.data,
          source: "ai",
          syncStatus: "synced",
        });

        return {
          itinerary: remoteItinerary,
          usedFallback: false,
          warnings: [...new Set([...warnings, ...collectPlanningWarnings(remoteItinerary)])],
        };
      }
    } else if (error) {
      warnings.push(error.message);
    }
  }

  const fallback = await enrichTransitLegs(
    buildFallbackItinerary(normalizedPreferences, places, {
      startArea: getStartAreaOrDefault(normalizedPreferences.startAreaId),
      weatherSnapshot,
    })
  );

  return {
    itinerary: fallback,
    usedFallback: true,
    warnings: [
      ...new Set([
        ...warnings,
        ...collectPlanningWarnings(fallback),
        "Fallback planner used because remote AI was unavailable.",
      ]),
    ],
  };
};

export const getTransitRoute = async (from: Place, to: Place, locale: AppLocale = "ko") => {
  if (hasSupabaseConfig && supabase) {
    const { data, error } = await supabase.functions.invoke("get-transit-route", {
      body: {
        from,
        to,
        locale,
      },
    });

    if (!error && data) {
      return data as TransitLeg;
    }
  }

  return (await fetchOdsayTransit(from, to)) ?? buildTransitLeg(from, to, locale);
};
