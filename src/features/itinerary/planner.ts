import { addDays, addMinutes, formatISO, parseISO } from "date-fns";
import { getDistance } from "geolib";

import { startAreas } from "../../data/start-areas";
import { seedPlaces } from "../../data/seed";
import {
  AppLocale,
  Coordinates,
  Itinerary,
  ItineraryDay,
  ItineraryStop,
  Place,
  StartArea,
  TransitLeg,
  TripPreferences,
  WeatherSnapshot,
} from "../../types/domain";
import { createId } from "../../utils/id";
import { buildNavigationLinks } from "../../utils/maps";
import { tText } from "../../utils/localized";
import { buildBudgetSummary, getStartAreaOrDefault, makeBudgetLabel, normalizeTripPreferences } from "./planning";
import { itinerarySchema } from "./schema";

type ScoredPlace = Place & { score: number };

const neutralWeatherSnapshot = (travelDate: string): WeatherSnapshot => ({
  status: "unavailable",
  source: "fallback",
  date: travelDate,
  signal: "mixed",
  summary: {
    ko: "날씨 정보를 불러오지 못해 실내외 균형형 경로로 추천했어요.",
    en: "Weather data was unavailable, so we built a balanced route.",
  },
});

const estimateTransitFareKrw = (distanceKm: number, mode: TripPreferences["mobilityMode"] = "mixed") => {
  if (distanceKm < 1.3 || mode === "walk") {
    return 0;
  }

  if (distanceKm < 4) {
    return 1600;
  }

  if (distanceKm < 9) {
    return 1900;
  }

  return 2200;
};

const weatherScore = (place: Place, weatherSnapshot: WeatherSnapshot) => {
  switch (weatherSnapshot.signal) {
    case "rainy":
      return (place.indoor ? 22 : -10) + (place.accessibility ? 6 : 0);
    case "clear":
      return place.categories.includes("nature") || place.categories.includes("photospot") ? 16 : 2;
    case "heat":
      return (place.indoor ? 18 : -4) + (place.accessibility ? 4 : 0);
    case "cold":
      return place.indoor ? 15 : 1;
    default:
      return place.indoor ? 6 : 4;
  }
};

const distanceScore = (place: Place, startArea: StartArea) => {
  const distanceKm = getDistance(place.coordinates, startArea.coordinates) / 1000;

  if (distanceKm < 2.5) {
    return 16;
  }

  if (distanceKm < 6) {
    return 10;
  }

  if (distanceKm < 11) {
    return 5;
  }

  return 1;
};

export const scorePlaces = (
  preferences: TripPreferences,
  places = seedPlaces,
  planningInput?: {
    weatherSnapshot?: WeatherSnapshot;
    startArea?: StartArea;
  }
): ScoredPlace[] => {
  const normalized = normalizeTripPreferences(preferences);
  const startArea = planningInput?.startArea ?? getStartAreaOrDefault(normalized.startAreaId);
  const weatherSnapshot = planningInput?.weatherSnapshot ?? neutralWeatherSnapshot(normalized.travelDate);

  return places
    .map((place) => {
      const interestScore = place.categories.reduce(
        (total, category) => total + (normalized.interests.includes(category) ? 16 : 0),
        0
      );
      const accessibilityScore = normalized.accessibilityNeeds ? (place.accessibility ? 24 : -18) : 8;
      const fallbackScore = normalized.indoorFallback ? (place.indoor ? 12 : 4) : 0;
      const mobilityScore =
        normalized.mobilityMode === "walk"
          ? place.recommendedStayMinutes <= 80
            ? 10
            : 2
          : 12;
      const budgetScore = place.priceLevel === normalized.budgetLevel ? 12 : 5;
      const companionScore =
        normalized.companionType === "family"
          ? place.accessibility
            ? 12
            : 4
          : normalized.companionType === "couple"
            ? place.categories.includes("photospot")
              ? 10
              : 4
            : 6;

      return {
        ...place,
        score:
          interestScore +
          accessibilityScore +
          fallbackScore +
          mobilityScore +
          budgetScore +
          companionScore +
          weatherScore(place, weatherSnapshot) +
          distanceScore(place, startArea) +
          place.popularity * 0.35,
      };
    })
    .sort((left, right) => right.score - left.score);
};

export const buildTransitLeg = (
  fromPlace: Place,
  toPlace: Place,
  locale: AppLocale,
  provider: "odsay" | "fallback" = "fallback",
  mobilityMode: TripPreferences["mobilityMode"] = "mixed"
): TransitLeg => {
  const meters = getDistance(fromPlace.coordinates, toPlace.coordinates);
  const distanceKm = Number((meters / 1000).toFixed(1));
  const durationMinutes =
    distanceKm < 1.3 ? Math.max(12, Math.round(distanceKm * 18)) : Math.round(distanceKm * 9 + 14);
  const estimatedFareKrw = estimateTransitFareKrw(distanceKm, mobilityMode);

  const steps =
    distanceKm < 1.3 || mobilityMode === "walk"
      ? [
          {
            mode: "walk" as const,
            label: {
              ko: `도보 ${durationMinutes}분 이동`,
              en: `Walk for about ${durationMinutes} min`,
            },
          },
        ]
      : [
          {
            mode: "metro" as const,
            label: {
              ko: "지하철 1회 환승 추천",
              en: "Recommended with one metro transfer",
            },
          },
          {
            mode: "walk" as const,
            label: {
              ko: "역에서 도보 연결",
              en: "Short station-to-stop walk",
            },
          },
        ];

  return {
    fromPlaceId: fromPlace.id,
    toPlaceId: toPlace.id,
    summary: {
      ko:
        distanceKm < 1.3 || mobilityMode === "walk"
          ? `${tText(fromPlace.name, locale)}에서 ${tText(toPlace.name, locale)}까지 도보 이동`
          : `${tText(fromPlace.name, locale)} -> ${tText(toPlace.name, locale)} 대중교통 이동`,
      en:
        distanceKm < 1.3 || mobilityMode === "walk"
          ? `Walk from ${tText(fromPlace.name, locale)} to ${tText(toPlace.name, locale)}`
          : `Transit from ${tText(fromPlace.name, locale)} to ${tText(toPlace.name, locale)}`,
    },
    durationMinutes,
    distanceKm,
    estimatedFareKrw,
    provider,
    steps,
    navigationLinks: buildNavigationLinks(toPlace.coordinates),
  };
};

const targetStopCount = (tripDays: number, totalPlaces: number) => Math.min(totalPlaces, Math.max(4, tripDays * 3));

const minimumStopCount = (tripDays: number, totalPlaces: number) =>
  Math.min(totalPlaces, Math.max(tripDays, Math.min(3, totalPlaces)));

const selectPlacesWithinBudget = (scored: ScoredPlace[], preferences: TripPreferences) => {
  const targetStops = targetStopCount(preferences.tripDays, scored.length);
  const minimumStops = minimumStopCount(preferences.tripDays, scored.length);
  const selected: ScoredPlace[] = [];
  let estimatedTotalKrw = 0;
  const baseTransitCostPerLeg = preferences.mobilityMode === "walk" ? 0 : 1600 * preferences.partySize;

  for (const place of scored) {
    if (selected.length >= targetStops) {
      break;
    }

    const addedCost =
      place.estimatedSpendKrw * preferences.partySize + (selected.length > 0 ? baseTransitCostPerLeg : 0);

    if (estimatedTotalKrw + addedCost <= preferences.totalBudgetKrw) {
      selected.push(place);
      estimatedTotalKrw += addedCost;
    }
  }

  if (selected.length < minimumStops) {
    for (const place of [...scored].sort(
      (left, right) => left.estimatedSpendKrw - right.estimatedSpendKrw || right.score - left.score
    )) {
      if (selected.some((candidate) => candidate.id === place.id)) {
        continue;
      }

      const addedCost =
        place.estimatedSpendKrw * preferences.partySize + (selected.length > 0 ? baseTransitCostPerLeg : 0);
      if (estimatedTotalKrw + addedCost > preferences.totalBudgetKrw) {
        continue;
      }

      selected.push(place);
      estimatedTotalKrw += addedCost;

      if (selected.length >= minimumStops) {
        break;
      }
    }
  }

  if (selected.length < minimumStops) {
    return {
      places: [...scored]
        .sort((left, right) => left.estimatedSpendKrw - right.estimatedSpendKrw || right.score - left.score)
        .slice(0, minimumStops),
      strategy: "minimum" as const,
    };
  }

  return {
    places: selected,
    strategy: "within" as const,
  };
};

const orderPlacesForRoute = (places: ScoredPlace[], startArea: StartArea) => {
  const remaining = [...places];
  const ordered: ScoredPlace[] = [];
  let anchor: Coordinates = startArea.coordinates;

  while (remaining.length > 0) {
    remaining.sort((left, right) => {
      const leftDistanceKm = getDistance(anchor, left.coordinates) / 1000;
      const rightDistanceKm = getDistance(anchor, right.coordinates) / 1000;
      const leftRouteScore = left.score - leftDistanceKm * 2.1 - left.estimatedSpendKrw / 15000;
      const rightRouteScore = right.score - rightDistanceKm * 2.1 - right.estimatedSpendKrw / 15000;
      return rightRouteScore - leftRouteScore;
    });

    const next = remaining.shift();
    if (!next) {
      break;
    }

    ordered.push(next);
    anchor = next.coordinates;
  }

  return ordered;
};

const chunkByDays = (places: Place[], tripDays: number) => {
  const buckets: Place[][] = [];
  const baseSize = Math.floor(places.length / tripDays);
  const remainder = places.length % tripDays;
  let cursor = 0;

  for (let dayIndex = 0; dayIndex < tripDays; dayIndex += 1) {
    const sliceSize = baseSize + (dayIndex < remainder ? 1 : 0);
    buckets.push(places.slice(cursor, cursor + Math.max(1, sliceSize)));
    cursor += Math.max(1, sliceSize);
  }

  return buckets.filter((bucket) => bucket.length > 0);
};

const dayTheme = (places: Place[]) => {
  const hasSea = places.some((place) => place.categories.includes("nature"));
  const hasFood = places.some((place) => place.categories.includes("food"));
  const hasNight = places.some((place) => place.categories.includes("night"));

  if (hasNight && hasFood) {
    return {
      ko: "야경과 미식 루트",
      en: "Night views and food route",
    };
  }

  if (hasSea) {
    return {
      ko: "바다와 풍경 루트",
      en: "Sea and scenic route",
    };
  }

  if (hasFood) {
    return {
      ko: "로컬 미식 문화 루트",
      en: "Local food and culture route",
    };
  }

  return {
    ko: "부산 큐레이션 루트",
    en: "Curated Busan route",
  };
};

const createDayStops = (
  places: Place[],
  dayIndex: number,
  preferences: TripPreferences,
  locale: AppLocale
): ItineraryStop[] => {
  let cursor = parseISO(`${preferences.travelDate}T09:00:00+09:00`);
  cursor = addDays(cursor, dayIndex);

  return places.map((place, index) => {
    const previous = places[index - 1];
    const transit = previous
      ? buildTransitLeg(previous, place, locale, "fallback", preferences.mobilityMode)
      : undefined;

    if (transit) {
      cursor = addMinutes(cursor, transit.durationMinutes);
    }

    const startTime = formatISO(cursor);
    cursor = addMinutes(cursor, place.recommendedStayMinutes);
    const endTime = formatISO(cursor);
    cursor = addMinutes(cursor, 25);

    return {
      id: createId(),
      order: index + 1,
      date: startTime.slice(0, 10),
      startTime,
      endTime,
      highlight: {
        ko: `${place.district} 핵심 스팟`,
        en: `Key stop in ${place.district}`,
      },
      note: {
        ko: place.indoor
          ? "날씨 변화에도 안정적으로 소화하기 좋은 실내 중심 스팟이에요."
          : "현장 혼잡도에 따라 체류 시간을 조금 줄여도 좋아요.",
        en: place.indoor
          ? "An indoor-friendly stop that still works well in shifting weather."
          : "You can shorten this stop slightly if the area gets crowded.",
      },
      place,
      transitFromPrevious: transit,
    };
  });
};

const sumDayCost = (day: ItineraryDay, partySize: number) =>
  day.stops.reduce(
    (total, stop) =>
      total +
      stop.place.estimatedSpendKrw * partySize +
      (stop.transitFromPrevious?.estimatedFareKrw ?? 0) * partySize,
    0
  );

const buildPlanningMeta = ({
  days,
  preferences,
  startArea,
  weatherSnapshot,
  strategy,
}: {
  days: ItineraryDay[];
  preferences: TripPreferences;
  startArea: StartArea;
  weatherSnapshot: WeatherSnapshot;
  strategy: "within" | "minimum";
}) => {
  const estimatedTotalKrw = Math.round(days.reduce((total, day) => total + sumDayCost(day, preferences.partySize), 0));

  return {
    startArea,
    weatherSnapshot,
    budgetSummary: buildBudgetSummary({
      totalBudgetKrw: preferences.totalBudgetKrw,
      estimatedTotalKrw,
      partySize: preferences.partySize,
      strategy:
        strategy === "minimum" || estimatedTotalKrw > preferences.totalBudgetKrw ? "minimum" : "within",
    }),
  };
};

const trimRouteToBudget = ({
  places,
  preferences,
  startArea,
  locale,
}: {
  places: ScoredPlace[];
  preferences: TripPreferences;
  startArea: StartArea;
  locale: AppLocale;
}) => {
  const minimumStops = minimumStopCount(preferences.tripDays, places.length);
  let working = [...places];
  let strategy: "within" | "minimum" = "within";

  while (working.length >= minimumStops) {
    const dayBuckets = chunkByDays(working, Math.min(preferences.tripDays, working.length));
    const days = dayBuckets.map((bucket, index) => ({
      dayNumber: index + 1,
      theme: dayTheme(bucket),
      stops: createDayStops(bucket, index, preferences, locale),
    }));
    const planningMeta = buildPlanningMeta({
      days,
      preferences,
      startArea,
      weatherSnapshot: neutralWeatherSnapshot(preferences.travelDate),
      strategy,
    });

    if (planningMeta.budgetSummary.estimatedTotalKrw <= preferences.totalBudgetKrw || working.length === minimumStops) {
      if (planningMeta.budgetSummary.estimatedTotalKrw > preferences.totalBudgetKrw) {
        strategy = "minimum";
      }

      return { places: working, strategy };
    }

    const removable = [...working]
      .sort((left, right) => right.estimatedSpendKrw - left.estimatedSpendKrw || left.score - right.score)
      .shift();

    if (!removable) {
      break;
    }

    working = working.filter((place) => place.id !== removable.id);
  }

  return { places: working, strategy: "minimum" as const };
};

export const buildFallbackItinerary = (
  preferences: TripPreferences,
  candidatePlaces = seedPlaces,
  planningInput?: {
    weatherSnapshot?: WeatherSnapshot;
    startArea?: StartArea;
  }
): Itinerary => {
  const normalizedPreferences = normalizeTripPreferences(preferences);
  const locale = normalizedPreferences.locale;
  const startArea = planningInput?.startArea ?? getStartAreaOrDefault(normalizedPreferences.startAreaId);
  const weatherSnapshot = planningInput?.weatherSnapshot ?? neutralWeatherSnapshot(normalizedPreferences.travelDate);
  const scored = scorePlaces(normalizedPreferences, candidatePlaces, { weatherSnapshot, startArea });
  const budgetSelection = selectPlacesWithinBudget(scored, normalizedPreferences);
  const orderedSelection = orderPlacesForRoute(budgetSelection.places, startArea);
  const trimmedSelection = trimRouteToBudget({
    places: orderedSelection,
    preferences: normalizedPreferences,
    startArea,
    locale,
  });
  const finalStrategy =
    budgetSelection.strategy === "minimum" || trimmedSelection.strategy === "minimum" ? "minimum" : "within";
  const dayBuckets = chunkByDays(trimmedSelection.places, Math.min(normalizedPreferences.tripDays, trimmedSelection.places.length));
  const days: ItineraryDay[] = dayBuckets.map((bucket, index) => ({
    dayNumber: index + 1,
    theme: dayTheme(bucket),
    stops: createDayStops(bucket, index, normalizedPreferences, locale),
  }));
  const planningMeta = buildPlanningMeta({
    days,
    preferences: normalizedPreferences,
    startArea,
    weatherSnapshot,
    strategy: finalStrategy,
  });
  const titleAnchor = trimmedSelection.places[0]?.name ?? startArea.name;

  return {
    id: createId(),
    routeSlug: `busan-${startArea.id}-${createId(6)}`,
    title: {
      ko: `${tText(titleAnchor, "ko")} 중심 ${normalizedPreferences.tripDays}일 루트`,
      en: `${normalizedPreferences.tripDays}-day Busan route around ${tText(titleAnchor, "en")}`,
    },
    summary: {
      ko:
        finalStrategy === "minimum"
          ? `${tText(startArea.name, "ko")} 출발 기준으로 예산을 최대한 맞춘 최소 예산 루트예요.`
          : `${tText(startArea.name, "ko")} 출발 기준으로 예산과 날씨를 함께 반영한 맞춤 루트예요.`,
      en:
        finalStrategy === "minimum"
          ? `A lowest-cost Busan route built from ${tText(startArea.name, "en")} when budget is very tight.`
          : `A personalized Busan route from ${tText(startArea.name, "en")} shaped by your budget and weather.`,
    },
    createdAt: formatISO(new Date()),
    locale,
    source: "fallback",
    shareStatus: "private",
    syncStatus: "synced",
    preferences: normalizedPreferences,
    days,
    ratingAverage: 4.6,
    estimatedBudgetLabel: makeBudgetLabel(normalizedPreferences.budgetLevel),
    planningMeta,
  };
};

export const buildIndoorFallback = (
  itinerary: Itinerary,
  candidatePlaces = seedPlaces
): Itinerary => {
  const indoorPlaces = candidatePlaces.filter((place) => place.indoor || place.accessibility);
  const preferences = {
    ...itinerary.preferences,
    indoorFallback: true,
  };

  return {
    ...buildFallbackItinerary(preferences, indoorPlaces, {
      startArea: itinerary.planningMeta?.startArea ?? startAreas[0],
      weatherSnapshot: {
        status: "live",
        source: "fallback",
        date: preferences.travelDate,
        signal: "rainy",
        summary: {
          ko: "비 예보를 반영해 실내 비중을 높인 대체 경로예요.",
          en: "An indoor-friendly reroute prepared for rainy conditions.",
        },
      },
    }),
    summary: {
      ko: "비나 일정 변수를 고려해 실내 위주로 다시 정리한 대체 루트예요.",
      en: "An indoor-friendly reroute prepared for rain, queues, or schedule drift.",
    },
  };
};

export const validateStructuredItinerary = (payload: unknown) => itinerarySchema.safeParse(payload);
