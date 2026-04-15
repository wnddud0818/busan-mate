import { appEnv, hasOdsayApiKey, hasSupabaseConfig, hasTourApiKey } from "../config/env";
import { seedPlaces } from "../data/seed";
import { buildFallbackItinerary, buildTransitLeg, validateStructuredItinerary } from "../features/itinerary/planner";
import { supabase } from "../lib/supabase";
import { AppLocale, GenerateItineraryResponse, Itinerary, Place, TransitLeg, TripPreferences } from "../types/domain";
import { createId } from "../utils/id";

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
    .map((item, index) => ({
      id: `tour-${item.contentid ?? index}`,
      slug: String(item.title).toLowerCase().replace(/\s+/g, "-"),
      district: item.addr1 ?? "Busan",
      categories: [...mapTourCategory(item.contenttypeid)],
      name: {
        ko: item.title,
        en: item.title,
      },
      description: {
        ko: item.addr1 ?? "부산 관광공사 공개 데이터 기반 추천 장소입니다.",
        en: item.addr1 ?? "Recommended from the Korea Tourism public dataset.",
      },
      signatureStory: {
        ko: item.addr1 ?? "공공 데이터에서 수집한 장소입니다.",
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
    }));
};

const fetchOdsayTransit = async (from: Place, to: Place): Promise<TransitLeg | null> => {
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

  return {
    ...buildTransitLeg(from, to, "ko", "odsay"),
    durationMinutes: firstPath.totalTime ?? 30,
    distanceKm: Number(((firstPath.totalDistance ?? 1000) / 1000).toFixed(1)),
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
            ? await fetchOdsayTransit(previous.place, stop.place).catch(() => null)
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

export const generateItinerary = async (
  preferences: TripPreferences
): Promise<GenerateItineraryResponse> => {
  const warnings: string[] = [];
  const places = await fetchCandidatePlaces().catch(() => {
    warnings.push("Tour API unavailable, using seeded Busan places.");
    return seedPlaces;
  });

  if (hasSupabaseConfig && supabase) {
    const { data, error } = await supabase.functions.invoke("generate-itinerary", {
      body: {
        preferences,
        places,
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
          warnings,
        };
      }
    } else if (error) {
      warnings.push(error.message);
    }
  }

  const fallback = await enrichTransitLegs(buildFallbackItinerary(preferences, places));

  return {
    itinerary: {
      ...fallback,
      id: fallback.id || createId(),
      syncStatus: fallback.syncStatus ?? "synced",
    },
    usedFallback: true,
    warnings: [...warnings, "Fallback planner used because remote AI was unavailable."],
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
