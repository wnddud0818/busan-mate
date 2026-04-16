import { getDistance } from "geolib";

import { appEnv, hasOdsayApiKey, hasSupabaseConfig, hasTourApiKey } from "../config/env";
import { seedPlaces } from "../data/seed";
import {
  buildBudgetSummary,
  estimatedSpendFromPriceLevel,
  getStartAreaOrDefault,
  normalizeTripPreferences,
} from "../features/itinerary/planning";
import { buildFallbackItinerary, buildTransitLeg, validateStructuredItinerary } from "../features/itinerary/planner";
import { buildOdsayTransitSteps } from "../features/itinerary/transit-steps";
import { canInvokeEdgeFunction, supabase } from "../lib/supabase";
import {
  AppLocale,
  GenerateItineraryResponse,
  Itinerary,
  LodgingSummary,
  Place,
  PlannerEngine,
  PlannerPlacesSource,
  StartArea,
  TransitLeg,
  TripPreferences,
} from "../types/domain";
import { logApiError, logApiRequest, logApiResponse, logDebugInfo, logPriceSnapshot } from "./debug-service";
import { fetchWeatherSnapshot } from "./weather-service";

type CandidatePlacesResult = {
  places: Place[];
  source: PlannerPlacesSource;
  liveCount: number;
  seedCount: number;
};

type TourApiItem = Record<string, unknown>;
type LodgingFallbackReason = "missing-api-key" | "live-rates-unavailable";
type TourLodgingCandidate = {
  contentId?: string;
  contentTypeId: string;
  title?: string;
  address?: string;
  latitude: number;
  longitude: number;
};
type ResolvedTourLodgingCandidate = {
  contentId: string;
  contentTypeId: string;
  title: string;
  address?: string;
  latitude: number;
  longitude: number;
};

const TOUR_API_BASE_URL = "https://apis.data.go.kr/B551011/KorService2";
const TOUR_LODGING_CONTENT_TYPE_ID = "32";

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

const toTourItems = (payload: unknown): TourApiItem[] => {
  const items = (payload as { response?: { body?: { items?: { item?: unknown } } } })?.response?.body?.items?.item;

  if (Array.isArray(items)) {
    return items.filter((item): item is TourApiItem => Boolean(item && typeof item === "object"));
  }

  if (items && typeof items === "object") {
    return [items as TourApiItem];
  }

  return [];
};

const toTrimmedString = (value: unknown) => {
  if (typeof value !== "string") {
    return undefined;
  }

  const next = value.trim();
  return next.length > 0 ? next : undefined;
};

const isHttpUrl = (value?: string) => Boolean(value && /^https?:\/\//i.test(value));

const parsePositiveNumber = (value: unknown) => {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return Math.round(value);
  }

  if (typeof value !== "string") {
    return null;
  }

  const digits = value.replace(/[^\d.]/g, "");
  if (!digits) {
    return null;
  }

  const parsed = Number(digits);
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : null;
};

const getFallbackRoomCount = (partySize: number) => Math.max(1, Math.ceil(partySize / 2));

const getFallbackNightlyBaseRate = (budgetLevel: TripPreferences["budgetLevel"]) => {
  switch (budgetLevel) {
    case "value":
      return 90000;
    case "premium":
      return 220000;
    default:
      return 140000;
  }
};

const hasResolvedTourLodgingCandidate = (
  candidate: TourLodgingCandidate
): candidate is ResolvedTourLodgingCandidate =>
  Boolean(
    candidate.contentId &&
      candidate.title &&
      Number.isFinite(candidate.latitude) &&
      Number.isFinite(candidate.longitude)
  );

const buildNoLodgingSummary = (): LodgingSummary => ({
  source: "none",
  nights: 0,
  estimatedNightlyRateKrw: 0,
  estimatedRoomCount: 0,
  estimatedTotalKrw: 0,
});

const buildFallbackLodgingSummary = ({
  preferences,
  startArea,
  reason,
}: {
  preferences: TripPreferences;
  startArea: StartArea;
  reason: LodgingFallbackReason;
}): LodgingSummary => {
  const nights = Math.max(0, preferences.tripDays - 1);
  if (nights === 0) {
    return buildNoLodgingSummary();
  }

  const estimatedRoomCount = getFallbackRoomCount(preferences.partySize);
  const estimatedNightlyRateKrw = getFallbackNightlyBaseRate(preferences.budgetLevel) * estimatedRoomCount;
  const estimatedTotalKrw = estimatedNightlyRateKrw * nights;

  return {
    source: "fallback",
    nights,
    estimatedNightlyRateKrw,
    estimatedRoomCount,
    estimatedTotalKrw,
    propertyName: {
      ko: `${startArea.name.ko} 인근 숙소 예상`,
      en: `Estimated stay near ${startArea.name.en}`,
    },
    district: startArea.district.ko,
    coordinates: startArea.coordinates,
    note:
      reason === "missing-api-key"
        ? {
            ko: "TourAPI 숙박 요금 키가 없어 예산 수준 기반 숙소 추정치를 사용했어요.",
            en: "Used a budget-based lodging estimate because the TourAPI stay key is unavailable.",
          }
        : {
            ko: "VisitKorea 숙박 요금을 찾지 못해 예산 수준 기반 숙소 추정치를 사용했어요.",
            en: "Used a budget-based lodging estimate because no VisitKorea stay rates were available.",
          },
  };
};

const fetchTourApiItems = async ({
  label,
  path,
  params,
}: {
  label: string;
  path: string;
  params: Record<string, string>;
}) => {
  const endpoint = `${TOUR_API_BASE_URL}/${path}`;
  const searchParams = new URLSearchParams({
    MobileOS: "ETC",
    MobileApp: "BusanMate",
    _type: "json",
    serviceKey: appEnv.tourApiKey,
    ...params,
  });
  const traceId = logApiRequest({
    label,
    summary: `Fetching ${path} from VisitKorea.`,
    payload: {
      endpoint,
      params: Object.fromEntries(searchParams.entries()),
    },
  });

  try {
    const response = await fetch(`${endpoint}?${searchParams.toString()}`);
    if (!response.ok) {
      throw new Error(`${path} failed with status ${response.status}`);
    }

    const payload = await response.json();
    const items = toTourItems(payload);

    logApiResponse({
      label,
      traceId,
      summary: `VisitKorea ${path} returned ${items.length} item(s).`,
      payload: {
        count: items.length,
        raw: payload,
      },
    });

    return items;
  } catch (error) {
    logApiError({
      label,
      traceId,
      summary: `VisitKorea ${path} lookup failed.`,
      error,
      payload: {
        endpoint,
        params: Object.fromEntries(searchParams.entries()),
      },
    });
    throw error;
  }
};

const pickBestRoomRate = (rooms: TourApiItem[], partySize: number) =>
  rooms.reduce<{
    estimatedNightlyRateKrw: number;
    estimatedRoomCount: number;
  } | null>((best, room) => {
    const nightlyCandidates = [
      parsePositiveNumber(room.roomoffseasonminfee1),
      parsePositiveNumber(room.roomoffseasonminfee2),
      parsePositiveNumber(room.roompeakseasonminfee1),
      parsePositiveNumber(room.roompeakseasonminfee2),
    ].filter((value): value is number => value != null);

    if (nightlyCandidates.length === 0) {
      return best;
    }

    const roomCapacity = Math.max(
      1,
      parsePositiveNumber(room.roommaxcount) ?? parsePositiveNumber(room.roombasecount) ?? 2
    );
    const estimatedRoomCount = Math.max(1, Math.ceil(partySize / roomCapacity));
    const estimatedNightlyRateKrw = Math.min(...nightlyCandidates) * estimatedRoomCount;

    if (!best || estimatedNightlyRateKrw < best.estimatedNightlyRateKrw) {
      return {
        estimatedNightlyRateKrw,
        estimatedRoomCount,
      };
    }

    return best;
  }, null);

const fetchVisitKoreaLodgingSummary = async (
  preferences: TripPreferences,
  startArea: StartArea
): Promise<LodgingSummary | null> => {
  const nights = Math.max(0, preferences.tripDays - 1);
  if (nights === 0) {
    return buildNoLodgingSummary();
  }

  const candidates = (
    await fetchTourApiItems({
      label: "visit-korea.areaBasedList2.lodging",
      path: "areaBasedList2",
      params: {
        areaCode: "6",
        contentTypeId: TOUR_LODGING_CONTENT_TYPE_ID,
        numOfRows: "20",
        pageNo: "1",
      },
    })
  )
    .map<TourLodgingCandidate>((item) => ({
      contentId: toTrimmedString(item.contentid),
      contentTypeId: toTrimmedString(item.contenttypeid) ?? TOUR_LODGING_CONTENT_TYPE_ID,
      title: toTrimmedString(item.title),
      address: toTrimmedString(item.addr1),
      latitude: Number(item.mapy),
      longitude: Number(item.mapx),
    }))
    .filter(hasResolvedTourLodgingCandidate)
    .sort(
      (left, right) =>
        getDistance(
          { latitude: left.latitude, longitude: left.longitude },
          startArea.coordinates
        ) -
        getDistance(
          { latitude: right.latitude, longitude: right.longitude },
          startArea.coordinates
        )
    )
    .slice(0, 8);

  for (const candidate of candidates) {
    const [introItems, roomItems] = await Promise.all([
      fetchTourApiItems({
        label: "visit-korea.detailIntro2",
        path: "detailIntro2",
        params: {
          contentId: candidate.contentId,
          contentTypeId: candidate.contentTypeId,
        },
      }).catch(() => []),
      fetchTourApiItems({
        label: "visit-korea.detailInfo2",
        path: "detailInfo2",
        params: {
          contentId: candidate.contentId,
          contentTypeId: candidate.contentTypeId,
        },
      }).catch(() => []),
    ]);

    const roomRate = pickBestRoomRate(roomItems, preferences.partySize);
    if (!roomRate) {
      continue;
    }

    const intro = introItems[0];
    const bookingUrl = toTrimmedString(intro?.reservationurl);

    return {
      source: "visit-korea",
      nights,
      estimatedNightlyRateKrw: roomRate.estimatedNightlyRateKrw,
      estimatedRoomCount: roomRate.estimatedRoomCount,
      estimatedTotalKrw: roomRate.estimatedNightlyRateKrw * nights,
      propertyName: {
        ko: candidate.title,
        en: candidate.title,
      },
      district: candidate.address,
      coordinates: {
        latitude: candidate.latitude,
        longitude: candidate.longitude,
      },
      bookingUrl: isHttpUrl(bookingUrl) ? bookingUrl : undefined,
      checkInTime: toTrimmedString(intro?.checkintime),
      checkOutTime: toTrimmedString(intro?.checkouttime),
      note: {
        ko: "숙소비는 VisitKorea 공개 최저 객실요금 기준 추정이에요.",
        en: "Lodging is estimated from the lowest published VisitKorea room rate.",
      },
    };
  }

  return null;
};

const resolveLodgingSummary = async (
  preferences: TripPreferences,
  startArea: StartArea
): Promise<LodgingSummary> => {
  const nights = Math.max(0, preferences.tripDays - 1);
  if (nights === 0) {
    return buildNoLodgingSummary();
  }

  if (!preferences.includeLodgingCost) {
    logDebugInfo({
      label: "visit-korea.lodging",
      summary: "Lodging cost was excluded by user preference.",
      payload: {
        startArea: startArea.id,
        nights,
      },
    });
    return buildNoLodgingSummary();
  }

  if (!hasTourApiKey) {
    logDebugInfo({
      label: "visit-korea.lodging",
      summary: "Tour API key is missing, so a fallback lodging estimate is being used.",
      payload: {
        startArea: startArea.id,
        nights,
      },
    });
    return buildFallbackLodgingSummary({
      preferences,
      startArea,
      reason: "missing-api-key",
    });
  }

  try {
    const liveLodging = await fetchVisitKoreaLodgingSummary(preferences, startArea);
    if (liveLodging) {
      return liveLodging;
    }
  } catch (error) {
    logApiError({
      label: "visit-korea.lodging",
      summary: "VisitKorea lodging lookup failed, so a fallback estimate is being used.",
      error,
      payload: {
        startArea: startArea.id,
        nights,
      },
    });
  }

  return buildFallbackLodgingSummary({
    preferences,
    startArea,
    reason: "live-rates-unavailable",
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
  const endpoint = "https://apis.data.go.kr/B551011/KorService2/areaBasedList2";
  const traceId = logApiRequest({
    label: "visit-korea.areaBasedList2",
    summary: "Fetching live Busan candidate places from VisitKorea.",
    payload: {
      endpoint,
      params: Object.fromEntries(params.entries()),
    },
  });

  try {
    const response = await fetch(`${endpoint}?${params.toString()}`);
    if (!response.ok) {
      throw new Error(`VisitKorea area list failed with status ${response.status}`);
    }

    const payload = await response.json();
    const items = payload?.response?.body?.items?.item;
    if (!Array.isArray(items)) {
      logApiResponse({
        label: "visit-korea.areaBasedList2",
        traceId,
        summary: "VisitKorea returned no usable items array.",
        payload,
      });
      return [];
    }

    const places: Place[] = items
      .filter((item) => item?.mapx && item?.mapy && item?.title && item?.contenttypeid !== "32")
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
            ko: item.addr1 ?? "부산 관광 공공데이터 기반 추천 장소입니다.",
            en: item.addr1 ?? "Recommended from the Korea Tourism public dataset.",
          },
          signatureStory: {
            ko: item.addr1 ?? "공공 관광 데이터를 바탕으로 수집한 장소입니다.",
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
          priceLevel: "balanced" as const,
          estimatedSpendKrw: estimatedSpendFromPriceLevel("balanced", categories),
        };
      });

    logApiResponse({
      label: "visit-korea.areaBasedList2",
      traceId,
      summary: `Loaded ${places.length} candidate places from VisitKorea.`,
      payload: {
        count: places.length,
        places,
        raw: payload,
      },
    });

    return places;
  } catch (error) {
    logApiError({
      label: "visit-korea.areaBasedList2",
      traceId,
      summary: "VisitKorea place fetch failed.",
      error,
    });
    throw error;
  }
};

const fetchOdsayTransit = async (
  from: Place,
  to: Place,
  mobilityMode: TripPreferences["mobilityMode"] = "mixed"
): Promise<TransitLeg | null> => {
  if (mobilityMode === "car") {
    logDebugInfo({
      label: "odsay.searchPubTransPathT",
      summary: "Skipping ODsay because car mode uses fallback driving legs.",
      payload: {
        from: from.name.en,
        to: to.name.en,
        mobilityMode,
      },
    });
    return null;
  }

  const params = new URLSearchParams({
    SX: String(from.coordinates.longitude),
    SY: String(from.coordinates.latitude),
    EX: String(to.coordinates.longitude),
    EY: String(to.coordinates.latitude),
    apiKey: appEnv.odsayApiKey,
  });
  const endpoint = "https://api.odsay.com/v1/api/searchPubTransPathT";
  const traceId = logApiRequest({
    label: "odsay.searchPubTransPathT",
    summary: "Fetching live transit leg from ODsay.",
    payload: {
      endpoint,
      from: from.name.en,
      to: to.name.en,
      mobilityMode,
      params: Object.fromEntries(params.entries()),
    },
  });

  try {
    const response = await fetch(`${endpoint}?${params.toString()}`);
    if (!response.ok) {
      logApiError({
        label: "odsay.searchPubTransPathT",
        traceId,
        summary: `ODsay returned status ${response.status}.`,
        error: new Error(`ODsay returned status ${response.status}`),
        payload: {
          from: from.name.en,
          to: to.name.en,
        },
      });
      return null;
    }

    const payload = await response.json();
    const firstPath = payload?.result?.path?.[0];
    const firstPathInfo = firstPath?.info;
    if (!firstPathInfo) {
      logApiResponse({
        label: "odsay.searchPubTransPathT",
        traceId,
        summary: "ODsay returned no candidate transit path.",
        payload,
      });
      return null;
    }

    const fallbackLeg = buildTransitLeg(from, to, "ko", "odsay", mobilityMode);
    const parsedSteps = buildOdsayTransitSteps(firstPath?.subPath);
    const leg: TransitLeg = {
      ...fallbackLeg,
      durationMinutes: firstPathInfo.totalTime ?? fallbackLeg.durationMinutes,
      distanceKm: Number(((firstPathInfo.totalDistance ?? fallbackLeg.distanceKm * 1000) / 1000).toFixed(1)),
      estimatedFareKrw: firstPathInfo.payment ?? fallbackLeg.estimatedFareKrw,
      steps: parsedSteps.length > 0 ? parsedSteps : fallbackLeg.steps,
      summary: {
        ko: `${from.name.ko} -> ${to.name.ko} 실시간 대중교통`,
        en: `Live transit from ${from.name.en} to ${to.name.en}`,
      },
    };

    logApiResponse({
      label: "odsay.searchPubTransPathT",
      traceId,
      summary: `Transit leg resolved in ${leg.durationMinutes} min / ${leg.estimatedFareKrw} KRW.`,
      payload: {
        leg,
        raw: payload,
      },
    });

    return leg;
  } catch (error) {
    logApiError({
      label: "odsay.searchPubTransPathT",
      traceId,
      summary: "ODsay transit lookup failed.",
      error,
      payload: {
        from: from.name.en,
        to: to.name.en,
        mobilityMode,
      },
    });
    return null;
  }
};

const enrichTransitLegs = async (itinerary: Itinerary) => {
  if (!hasOdsayApiKey) {
    logDebugInfo({
      label: "odsay.searchPubTransPathT",
      summary: "ODsay API key is missing, so fallback transit legs are being used.",
      payload: {
        itineraryId: itinerary.id,
      },
    });
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

const summarizeTransitProviders = (itinerary: Itinerary) => {
  const routeLegs = itinerary.days.flatMap((day) =>
    day.stops
      .map((stop) => stop.transitFromPrevious)
      .filter((leg): leg is TransitLeg => Boolean(leg))
  );

  return {
    liveTransitLegCount: routeLegs.filter((leg) => leg.provider === "odsay").length,
    fallbackTransitLegCount: routeLegs.filter((leg) => leg.provider === "fallback").length,
  };
};

const extractRouteLegDebug = (itinerary: Itinerary) =>
  itinerary.days.flatMap((day) =>
    day.stops.map((stop, index) => ({
      dayNumber: day.dayNumber,
      order: stop.order,
      fromPlace: day.stops[index - 1]?.place.name,
      toPlace: stop.place.name,
      durationMinutes: stop.transitFromPrevious?.durationMinutes,
      distanceKm: stop.transitFromPrevious?.distanceKm,
      estimatedFareKrw: stop.transitFromPrevious?.estimatedFareKrw,
      provider: stop.transitFromPrevious?.provider,
    }))
  );

const calculateItineraryRouteCostKrw = (itinerary: Itinerary) =>
  itinerary.days.reduce(
    (total, day) =>
      total +
      day.stops.reduce(
        (dayTotal, stop) =>
          dayTotal +
          stop.place.estimatedSpendKrw * itinerary.preferences.partySize +
          (stop.transitFromPrevious?.estimatedFareKrw ?? 0) * itinerary.preferences.partySize,
        0
      ),
    0
  );

const syncBudgetSummary = (itinerary: Itinerary): Itinerary => {
  const estimatedTotalKrw = Math.round(
    calculateItineraryRouteCostKrw(itinerary) + (itinerary.planningMeta.lodging?.estimatedTotalKrw ?? 0)
  );
  const baseStrategy = itinerary.planningMeta.debug?.selectedStrategy ?? itinerary.planningMeta.budgetSummary.strategy;
  const strategy =
    baseStrategy === "minimum" || estimatedTotalKrw > itinerary.preferences.totalBudgetKrw ? "minimum" : "within";

  return {
    ...itinerary,
    planningMeta: {
      ...itinerary.planningMeta,
      budgetSummary: buildBudgetSummary({
        totalBudgetKrw: itinerary.preferences.totalBudgetKrw,
        estimatedTotalKrw,
        partySize: itinerary.preferences.partySize,
        strategy,
      }),
    },
  };
};

const finalizePlanningDebug = ({
  itinerary,
  engine,
  placesSource,
  notes = [],
}: {
  itinerary: Itinerary;
  engine: PlannerEngine;
  placesSource: PlannerPlacesSource;
  notes?: string[];
}): Itinerary => {
  const budgetReadyItinerary = syncBudgetSummary(itinerary);
  const { liveTransitLegCount, fallbackTransitLegCount } = summarizeTransitProviders(budgetReadyItinerary);
  const totalStops = budgetReadyItinerary.days.reduce((total, day) => total + day.stops.length, 0);
  const nextNotes = [...new Set([...(budgetReadyItinerary.planningMeta.debug?.notes ?? []), ...notes])];
  const selectedStrategy =
    budgetReadyItinerary.planningMeta.budgetSummary.strategy === "minimum"
      ? "minimum"
      : budgetReadyItinerary.planningMeta.debug?.selectedStrategy ??
        budgetReadyItinerary.planningMeta.budgetSummary.strategy;

  return {
    ...budgetReadyItinerary,
    planningMeta: {
      ...budgetReadyItinerary.planningMeta,
      debug: {
        engine,
        routeResolvedWithoutFallback:
          engine === "remote-ai" &&
          placesSource !== "seed" &&
          budgetReadyItinerary.planningMeta.weatherSnapshot.source === "open-meteo" &&
          fallbackTransitLegCount === 0,
        withinBudget:
          budgetReadyItinerary.planningMeta.budgetSummary.estimatedTotalKrw <=
          budgetReadyItinerary.preferences.totalBudgetKrw,
        trimmedToBudget:
          budgetReadyItinerary.planningMeta.debug?.trimmedToBudget ??
          (budgetReadyItinerary.planningMeta.budgetSummary.strategy === "minimum"),
        selectedStrategy,
        targetStopCount:
          budgetReadyItinerary.planningMeta.debug?.targetStopCount ?? totalStops,
        minimumStopCount:
          budgetReadyItinerary.planningMeta.debug?.minimumStopCount ??
          Math.min(totalStops, Math.max(budgetReadyItinerary.preferences.tripDays, Math.min(3, totalStops))),
        finalStopCount: budgetReadyItinerary.planningMeta.debug?.finalStopCount ?? totalStops,
        placesSource,
        weatherSource: budgetReadyItinerary.planningMeta.weatherSnapshot.source,
        liveTransitLegCount,
        fallbackTransitLegCount,
        weatherValues:
          budgetReadyItinerary.planningMeta.debug?.weatherValues ?? budgetReadyItinerary.planningMeta.weatherSnapshot,
        candidatePlaces: budgetReadyItinerary.planningMeta.debug?.candidatePlaces ?? [],
        routeLegs:
          budgetReadyItinerary.planningMeta.debug?.routeLegs ?? extractRouteLegDebug(budgetReadyItinerary),
        notes: nextNotes,
      },
    },
  };
};

const logPlannerSnapshot = (itinerary: Itinerary, summary: string) => {
  logDebugInfo({
    kind: "planner",
    label: "generate-itinerary.planner",
    summary,
    payload: itinerary.planningMeta.debug,
  });
};

const fetchCandidatePlaces = async (): Promise<CandidatePlacesResult> => {
  if (!hasTourApiKey) {
    logDebugInfo({
      label: "visit-korea.areaBasedList2",
      summary: "Tour API key is missing, so seeded places are being used.",
      payload: {
        source: "seed",
      },
    });
    return {
      places: seedPlaces,
      source: "seed",
      liveCount: 0,
      seedCount: seedPlaces.length,
    };
  }

  const livePlaces = await fetchVisitKoreaPlaces().catch(() => []);
  if (livePlaces.length === 0) {
    logDebugInfo({
      label: "visit-korea.areaBasedList2",
      summary: "Falling back to seeded places because no live places were available.",
      payload: {
        source: "seed",
      },
    });
  }

  if (livePlaces.length > 0) {
    return {
      places: [...livePlaces, ...seedPlaces],
      source: "mixed",
      liveCount: livePlaces.length,
      seedCount: seedPlaces.length,
    };
  }

  return {
    places: seedPlaces,
    source: "seed",
    liveCount: 0,
    seedCount: seedPlaces.length,
  };
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

  if (itinerary.preferences.tripDays > 1 && itinerary.preferences.includeLodgingCost === false) {
    warnings.push(
      locale === "ko"
        ? "숙소비를 제외하고 예산을 계산했어요."
        : "The budget was calculated without lodging costs."
    );
  }

  if (itinerary.planningMeta.lodging?.source === "fallback" && itinerary.planningMeta.lodging.note) {
    warnings.push(itinerary.planningMeta.lodging.note[locale]);
  }

  return warnings;
};

export const generateItinerary = async (
  preferences: TripPreferences
): Promise<GenerateItineraryResponse> => {
  const normalizedPreferences = normalizeTripPreferences(preferences);
  const warnings: string[] = [];
  const startArea = getStartAreaOrDefault(normalizedPreferences.startAreaId);
  const [candidatePlaces, weatherSnapshot, lodging] = await Promise.all([
    fetchCandidatePlaces().catch(() => {
      warnings.push("Tour API unavailable, using seeded Busan places.");
      return {
        places: seedPlaces,
        source: "seed" as const,
        liveCount: 0,
        seedCount: seedPlaces.length,
      };
    }),
    fetchWeatherSnapshot({
      startAreaId: normalizedPreferences.startAreaId,
      travelDate: normalizedPreferences.travelDate,
    }),
    resolveLodgingSummary(normalizedPreferences, startArea).catch(() =>
      buildFallbackLodgingSummary({
        preferences: normalizedPreferences,
        startArea,
        reason: "live-rates-unavailable",
      })
    ),
  ]);
  const places = candidatePlaces.places;
  const remoteGenerationAvailable =
    hasSupabaseConfig && supabase ? await canInvokeEdgeFunction("generate-itinerary") : false;

  if (remoteGenerationAvailable) {
    const traceId = logApiRequest({
      label: "generate-itinerary",
      summary: "Sending itinerary generation payload to Supabase Edge Function.",
      payload: {
        preferences: normalizedPreferences,
        placesCount: places.length,
        startArea,
        weatherSnapshot,
        lodging,
      },
    });

    const { data, error } = await supabase!.functions.invoke("generate-itinerary", {
      body: {
        preferences: normalizedPreferences,
        places,
        startArea,
        weatherSnapshot,
        lodging,
      },
    });

    if (!error && data) {
      const candidate = validateStructuredItinerary(data.itinerary ?? data);
      if (candidate.success) {
        const remoteItinerary = finalizePlanningDebug({
          itinerary: await enrichTransitLegs({
            ...candidate.data,
            source: "ai",
            syncStatus: "synced",
          }),
          engine: "remote-ai",
          placesSource: candidatePlaces.source,
          notes: [
            `Candidate places: live ${candidatePlaces.liveCount}, seed ${candidatePlaces.seedCount}`,
          ],
        });

        logApiResponse({
          label: "generate-itinerary",
          traceId,
          summary: "Supabase returned a valid itinerary payload.",
          payload: {
            response: data,
            itineraryId: remoteItinerary.id,
            days: remoteItinerary.days.length,
            source: remoteItinerary.source,
          },
        });
        logPriceSnapshot({
          label: "generate-itinerary.price",
          itinerary: remoteItinerary,
        });
        logPlannerSnapshot(remoteItinerary, "Planner debug snapshot for the remote AI itinerary.");

        return {
          itinerary: remoteItinerary,
          usedFallback: false,
          warnings: [...new Set([...warnings, ...collectPlanningWarnings(remoteItinerary)])],
        };
      }

      logApiError({
        label: "generate-itinerary",
        traceId,
        summary: "Supabase returned data, but it did not match the itinerary schema.",
        error: candidate.error.flatten(),
        payload: {
          response: data,
        },
      });
    } else if (error) {
      warnings.push(error.message);
      logApiError({
        label: "generate-itinerary",
        traceId,
        summary: "Supabase itinerary generation failed.",
        error,
        payload: {
          preferences: normalizedPreferences,
          warning: error.message,
        },
      });
    }
  } else {
    logDebugInfo({
      label: "generate-itinerary",
      summary: hasSupabaseConfig
        ? "Supabase Edge Function is unavailable, so local itinerary planning is being used."
        : "Supabase is not configured, so local itinerary planning is being used.",
      payload: {
        preferences: normalizedPreferences,
        reason: hasSupabaseConfig ? "edge-function-unavailable" : "not-configured",
      },
    });
  }

  const fallback = await enrichTransitLegs(
    buildFallbackItinerary(normalizedPreferences, places, {
      startArea,
      engine: "local-fallback",
      lodging,
      weatherSnapshot,
    })
  );
  const debugReadyFallback = finalizePlanningDebug({
    itinerary: fallback,
    engine: fallback.planningMeta.debug?.engine ?? "local-fallback",
    placesSource: candidatePlaces.source,
    notes: [`Candidate places: live ${candidatePlaces.liveCount}, seed ${candidatePlaces.seedCount}`],
  });

  logDebugInfo({
    label: "generate-itinerary",
    summary: "Using local fallback itinerary planner.",
    payload: {
      warnings,
      itineraryId: debugReadyFallback.id,
      days: debugReadyFallback.days.length,
    },
  });
  logPriceSnapshot({
    label: "generate-itinerary.price",
    itinerary: debugReadyFallback,
    summary: "Price snapshot for the fallback itinerary.",
  });
  logPlannerSnapshot(debugReadyFallback, "Planner debug snapshot for the fallback itinerary.");

  return {
    itinerary: debugReadyFallback,
    usedFallback: true,
    warnings: [
      ...new Set([
        ...warnings,
        ...collectPlanningWarnings(debugReadyFallback),
        "Fallback planner used because remote AI was unavailable.",
      ]),
    ],
  };
};

export const getTransitRoute = async (from: Place, to: Place, locale: AppLocale = "ko") => {
  if (hasSupabaseConfig && supabase) {
    const traceId = logApiRequest({
      label: "get-transit-route",
      summary: "Requesting transit route from Supabase Edge Function.",
      payload: {
        from,
        to,
        locale,
      },
    });

    const { data, error } = await supabase.functions.invoke("get-transit-route", {
      body: {
        from,
        to,
        locale,
      },
    });

    if (!error && data) {
      logApiResponse({
        label: "get-transit-route",
        traceId,
        summary: "Supabase returned a transit route.",
        payload: data,
      });
      return data as TransitLeg;
    }

    if (error) {
      logApiError({
        label: "get-transit-route",
        traceId,
        summary: "Supabase transit route lookup failed. Falling back to local providers.",
        error,
        payload: {
          from: from.name.en,
          to: to.name.en,
          locale,
        },
      });
    }
  } else {
    logDebugInfo({
      label: "get-transit-route",
      summary: "Supabase is not configured, so local transit lookup is being used.",
      payload: {
        from: from.name.en,
        to: to.name.en,
        locale,
      },
    });
  }

  return (await fetchOdsayTransit(from, to)) ?? buildTransitLeg(from, to, locale);
};
