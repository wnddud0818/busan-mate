import { appEnv, hasOdsayApiKey, hasSupabaseConfig, hasTourApiKey } from "../config/env";
import { seedPlaces } from "../data/seed";
import {
  getStartAreaOrDefault,
  normalizeTripPreferences,
} from "../features/itinerary/planning";
import { buildFallbackItinerary, buildTransitLeg, validateStructuredItinerary } from "../features/itinerary/planner";
import {
  buildTourPlaceFromApi,
  getTourDetailEndpoint,
  VisitKoreaDetailItem,
  VisitKoreaListItem,
} from "../features/itinerary/tour-pricing";
import { supabase } from "../lib/supabase";
import { AppLocale, GenerateItineraryResponse, Itinerary, Place, TransitLeg, TripPreferences } from "../types/domain";
import { fetchWeatherSnapshot } from "./weather-service";
import { Platform } from "react-native";

const TOUR_API_BASE_URL = "https://apis.data.go.kr/B551011/KorService2";

const resolveOdsayApiKey = () => {
  if (Platform.OS === "android") {
    return appEnv.odsayApiKeyAndroid || appEnv.odsayApiKey;
  }

  if (Platform.OS === "ios") {
    return appEnv.odsayApiKeyIos || appEnv.odsayApiKey;
  }

  return appEnv.odsayApiKey;
};

const normalizeDetailItems = (payload: unknown): VisitKoreaDetailItem[] => {
  const items = (payload as { response?: { body?: { items?: { item?: unknown } } } })?.response?.body?.items?.item;

  if (Array.isArray(items)) {
    return items as VisitKoreaDetailItem[];
  }

  return items ? [items as VisitKoreaDetailItem] : [];
};

const fetchVisitKoreaDetailItems = async (
  contentId: string,
  contentTypeId?: string
): Promise<VisitKoreaDetailItem[]> => {
  const endpoint = getTourDetailEndpoint(contentTypeId);
  if (!endpoint) {
    return [];
  }

  const params = new URLSearchParams({
    MobileOS: "ETC",
    MobileApp: "BusanMate",
    _type: "json",
    contentId,
    numOfRows: "20",
    pageNo: "1",
    serviceKey: appEnv.tourApiKey,
  });

  if (contentTypeId) {
    params.set("contentTypeId", contentTypeId);
  }

  const response = await fetch(`${TOUR_API_BASE_URL}/${endpoint}?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`VisitKorea ${endpoint} failed`);
  }

  return normalizeDetailItems(await response.json());
};

const mapVisitKoreaItemToPlace = async (item: VisitKoreaListItem, index: number): Promise<Place> => {
  const contentId = item.contentid ? String(item.contentid) : "";
  const detailItems =
    contentId.length > 0
      ? await fetchVisitKoreaDetailItems(contentId, item.contenttypeid).catch(() => [])
      : [];

  return buildTourPlaceFromApi({
    item,
    detailItems,
    index,
  });
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

  const response = await fetch(`${TOUR_API_BASE_URL}/areaBasedList2?${params.toString()}`);

  if (!response.ok) {
    throw new Error("VisitKorea area list failed");
  }

  const payload = await response.json();
  const items = payload?.response?.body?.items?.item as VisitKoreaListItem[] | VisitKoreaListItem | undefined;
  if (!Array.isArray(items)) {
    return items?.mapx && items?.mapy && items?.title ? [await mapVisitKoreaItemToPlace(items, 0)] : [];
  }

  const candidates = items.filter((item) => item?.mapx && item?.mapy && item?.title);
  const batchSize = 5;
  const places: Place[] = [];

  for (let index = 0; index < candidates.length; index += batchSize) {
    const batch = candidates.slice(index, index + batchSize);
    const batchPlaces = await Promise.all(
      batch.map((item, batchIndex) => mapVisitKoreaItemToPlace(item, index + batchIndex))
    );
    places.push(...batchPlaces);
  }

  return places;
};

const fetchOdsayTransit = async (
  from: Place,
  to: Place,
  mobilityMode: TripPreferences["mobilityMode"] = "mixed"
): Promise<TransitLeg | null> => {
  const odsayApiKey = resolveOdsayApiKey();
  if (!odsayApiKey) {
    return null;
  }

  const params = new URLSearchParams({
    SX: String(from.coordinates.longitude),
    SY: String(from.coordinates.latitude),
    EX: String(to.coordinates.longitude),
    EY: String(to.coordinates.latitude),
    apiKey: odsayApiKey,
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
