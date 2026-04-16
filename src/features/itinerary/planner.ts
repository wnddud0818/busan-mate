import { addDays, addMinutes, differenceInMinutes, formatISO, parseISO } from "date-fns";
import { getDistance } from "geolib";

import { startAreas } from "../../data/start-areas";
import { seedPlaces } from "../../data/seed";
import {
  AppLocale,
  Coordinates,
  Itinerary,
  ItineraryDay,
  ItineraryStop,
  LodgingSummary,
  Place,
  PlanningDebug,
  PlannerCandidateDebug,
  PlannerEngine,
  PlannerRouteLegDebug,
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
import { buildFallbackTransitSteps } from "./transit-steps";

type ScoredPlace = Place & {
  score: number;
  scoreBreakdown: Record<string, number>;
  distanceFromStartKm: number;
};

type StopSlotKind = "default" | "lunch" | "dinner" | "night";

const DAY_START_MINUTES = 9 * 60;
const LATEST_DAY_START_MINUTES = 15 * 60;
const LUNCH_SLOT_MINUTES = 12 * 60 + 30;
const DINNER_SLOT_MINUTES = 18 * 60 + 30;
const NIGHT_SLOT_MINUTES = 19 * 60;

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

  if (mode === "car") {
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

const resolveTransitDurationMinutes = (
  distanceKm: number,
  mode: TripPreferences["mobilityMode"] = "mixed"
) => {
  if (distanceKm < 1.3 || mode === "walk") {
    return Math.max(12, Math.round(distanceKm * 18));
  }

  if (mode === "car") {
    return Math.max(8, Math.round(distanceKm * 4 + 8));
  }

  return Math.round(distanceKm * 9 + 14);
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

const distanceFromStartKm = (place: Place, startArea: StartArea) =>
  Number((getDistance(place.coordinates, startArea.coordinates) / 1000).toFixed(1));

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
          : normalized.mobilityMode === "car"
            ? 14
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
      const weatherScoreValue = weatherScore(place, weatherSnapshot);
      const distanceScoreValue = distanceScore(place, startArea);
      const popularityScore = Number((place.popularity * 0.35).toFixed(2));
      const scoreBreakdown = {
        interest: interestScore,
        accessibility: accessibilityScore,
        fallback: fallbackScore,
        mobility: mobilityScore,
        budget: budgetScore,
        companion: companionScore,
        weather: weatherScoreValue,
        distance: distanceScoreValue,
        popularity: popularityScore,
      };

      return {
        ...place,
        distanceFromStartKm: distanceFromStartKm(place, startArea),
        scoreBreakdown,
        score: Object.values(scoreBreakdown).reduce((total, value) => total + value, 0),
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
  const durationMinutes = resolveTransitDurationMinutes(distanceKm, mobilityMode);
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
  void steps;

  return {
    fromPlaceId: fromPlace.id,
    toPlaceId: toPlace.id,
    summary: {
      ko:
        distanceKm < 1.3 || mobilityMode === "walk"
          ? `${tText(fromPlace.name, locale)}에서 ${tText(toPlace.name, locale)}까지 도보 이동`
          : mobilityMode === "car"
            ? `${tText(fromPlace.name, locale)} -> ${tText(toPlace.name, locale)} 자차 이동`
            : `${tText(fromPlace.name, locale)} -> ${tText(toPlace.name, locale)} 대중교통 이동`,
      en:
        distanceKm < 1.3 || mobilityMode === "walk"
          ? `Walk from ${tText(fromPlace.name, locale)} to ${tText(toPlace.name, locale)}`
          : mobilityMode === "car"
            ? `Drive from ${tText(fromPlace.name, locale)} to ${tText(toPlace.name, locale)}`
            : `Transit from ${tText(fromPlace.name, locale)} to ${tText(toPlace.name, locale)}`,
    },
    durationMinutes,
    distanceKm,
    estimatedFareKrw,
    provider,
    steps: buildFallbackTransitSteps({
      distanceKm,
      durationMinutes,
      mobilityMode,
    }),
    navigationLinks: buildNavigationLinks(toPlace.coordinates),
  };
};

const targetStopCount = (tripDays: number, totalPlaces: number) => Math.min(totalPlaces, Math.max(4, tripDays * 3));

const minimumStopCount = (tripDays: number, totalPlaces: number) =>
  Math.min(totalPlaces, Math.max(tripDays, Math.min(3, totalPlaces)));

const getLodgingTotalKrw = (lodging?: LodgingSummary) => lodging?.estimatedTotalKrw ?? 0;

const selectPlacesWithinBudget = (
  scored: ScoredPlace[],
  preferences: TripPreferences,
  lodging?: LodgingSummary
) => {
  const targetStops = targetStopCount(preferences.tripDays, scored.length);
  const minimumStops = minimumStopCount(preferences.tripDays, scored.length);
  const availableBudgetKrw = Math.max(0, preferences.totalBudgetKrw - getLodgingTotalKrw(lodging));
  const selected: ScoredPlace[] = [];
  let estimatedTotalKrw = 0;
  const baseTransitCostPerLeg =
    preferences.mobilityMode === "walk" || preferences.mobilityMode === "car"
      ? 0
      : 1600 * preferences.partySize;

  for (const place of scored) {
    if (selected.length >= targetStops) {
      break;
    }

    const addedCost =
      place.estimatedSpendKrw * preferences.partySize + (selected.length > 0 ? baseTransitCostPerLeg : 0);

    if (estimatedTotalKrw + addedCost <= availableBudgetKrw) {
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
      if (estimatedTotalKrw + addedCost > availableBudgetKrw) {
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

const isFoodPlace = (place: Place) => place.categories.includes("food");
const isNightPlace = (place: Place) => place.categories.includes("night");

const movePlaceById = <T extends Place>(places: T[], placeId: string, targetIndex: number) => {
  const currentIndex = places.findIndex((place) => place.id === placeId);
  if (currentIndex === -1) {
    return places;
  }

  const next = [...places];
  const [item] = next.splice(currentIndex, 1);
  if (!item) {
    return places;
  }
  next.splice(Math.max(0, Math.min(targetIndex, next.length)), 0, item);
  return next;
};

const arrangePlacesForDaySchedule = <T extends Place>(places: T[]) => {
  let ordered = [...places];
  const nightSet = new Set(ordered.filter((place) => isNightPlace(place)).map((place) => place.id));

  if (nightSet.size > 0) {
    ordered = [...ordered.filter((place) => !nightSet.has(place.id)), ...ordered.filter((place) => nightSet.has(place.id))];
  }

  const foodPlaces = ordered.filter((place) => isFoodPlace(place));
  if (foodPlaces.length === 0) {
    return ordered;
  }

  const lunchCandidate = foodPlaces.find((place) => !isNightPlace(place)) ?? foodPlaces[0]!;
  const lunchIndex = Math.min(Math.max(1, Math.floor(ordered.length / 2) - 1), Math.max(ordered.length - 2, 0));
  ordered = movePlaceById(ordered, lunchCandidate.id, lunchIndex);

  const dinnerCandidate =
    [...ordered].reverse().find((place) => isFoodPlace(place) && place.id !== lunchCandidate.id) ??
    [...ordered].reverse().find((place) => isFoodPlace(place));

  if (dinnerCandidate) {
    const dinnerIndex = Math.max(ordered.length - (isNightPlace(dinnerCandidate) ? 1 : 2), 0);
    ordered = movePlaceById(ordered, dinnerCandidate.id, dinnerIndex);
  }

  return ordered;
};

const resolveTargetEndMinutes = (places: Place[], preferences: TripPreferences) => {
  const wantsNight = preferences.interests.includes("night") || places.some((place) => isNightPlace(place));

  if (!wantsNight) {
    return 20 * 60 + 30;
  }

  if (preferences.companionType === "friends" || preferences.companionType === "couple") {
    return 22 * 60;
  }

  return 21 * 60 + 30;
};

const resolveMealAnchors = (places: Place[]) => {
  const foodPlaces = places.filter((place) => isFoodPlace(place));
  const lunchPlace = foodPlaces.find((place) => !isNightPlace(place)) ?? foodPlaces[0];
  const dinnerPlace =
    [...foodPlaces].reverse().find((place) => place.id !== lunchPlace?.id) ??
    [...foodPlaces].reverse()[0];

  return {
    lunchPlaceId: lunchPlace?.id,
    dinnerPlaceId: dinnerPlace?.id,
  };
};

const resolveStopSlotKind = ({
  place,
  index,
  totalStops,
  lunchPlaceId,
  dinnerPlaceId,
}: {
  place: Place;
  index: number;
  totalStops: number;
  lunchPlaceId?: string;
  dinnerPlaceId?: string;
}): StopSlotKind => {
  if (place.id === lunchPlaceId) {
    return "lunch";
  }

  if (place.id === dinnerPlaceId && isFoodPlace(place) && !isNightPlace(place)) {
    return "dinner";
  }

  if (isNightPlace(place) && index >= Math.max(totalStops - 2, 0)) {
    return "night";
  }

  if (place.id === dinnerPlaceId && (isNightPlace(place) || index === totalStops - 1)) {
    return isNightPlace(place) ? "night" : "dinner";
  }

  return "default";
};

const resolveStayMinutes = ({
  place,
  preferences,
  slotKind,
  weatherSnapshot,
}: {
  place: Place;
  preferences: TripPreferences;
  slotKind: StopSlotKind;
  weatherSnapshot?: WeatherSnapshot;
}) => {
  let minutes = place.recommendedStayMinutes;

  if (place.categories.includes("culture") && place.indoor) {
    minutes = Math.max(minutes, 85);
  }

  if (place.categories.includes("history")) {
    minutes += 10;
  }

  if (place.categories.includes("photospot") || place.categories.includes("nature")) {
    minutes += 10;
  }

  if (weatherSnapshot?.signal === "clear" && place.categories.includes("nature")) {
    minutes += 10;
  }

  if (slotKind === "lunch") {
    minutes = Math.max(minutes, 75);
  }

  if (slotKind === "dinner") {
    minutes = Math.max(minutes, 85);
  }

  if (slotKind === "night") {
    minutes = Math.max(minutes, 95);
  }

  if (preferences.mobilityMode === "walk") {
    minutes = Math.min(minutes, 95);
  }

  return minutes;
};

const resolvePostStopBufferMinutes = (slotKind: StopSlotKind) => {
  switch (slotKind) {
    case "night":
      return 10;
    case "dinner":
      return 15;
    default:
      return 25;
  }
};

const alignCursorToMinutes = (cursor: Date, dayStart: Date, slotMinutes: number) => {
  const currentMinutes = differenceInMinutes(cursor, dayStart);
  return currentMinutes < slotMinutes ? addMinutes(dayStart, slotMinutes) : cursor;
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
  locale: AppLocale,
  weatherSnapshot?: WeatherSnapshot
): ItineraryStop[] => {
  const orderedPlaces = arrangePlacesForDaySchedule(places);
  const dayStart = addDays(parseISO(`${preferences.travelDate}T00:00:00+09:00`), dayIndex);
  const { lunchPlaceId, dinnerPlaceId } = resolveMealAnchors(orderedPlaces);
  const totalStops = orderedPlaces.length;
  const targetEndMinutes = resolveTargetEndMinutes(orderedPlaces, preferences);
  const estimatedRouteMinutes = orderedPlaces.reduce((total, place, index) => {
    const previous = orderedPlaces[index - 1];
    const transitDurationMinutes = previous
      ? buildTransitLeg(previous, place, locale, "fallback", preferences.mobilityMode).durationMinutes
      : 0;
    const slotKind = resolveStopSlotKind({
      place,
      index,
      totalStops,
      lunchPlaceId,
      dinnerPlaceId,
    });
    return (
      total +
      transitDurationMinutes +
      resolveStayMinutes({
        place,
        preferences,
        slotKind,
        weatherSnapshot,
      }) +
      (index < totalStops - 1 ? resolvePostStopBufferMinutes(slotKind) : 0)
    );
  }, 0);
  const firstAnchoredIndex = orderedPlaces.findIndex((place, index) => {
    const slotKind = resolveStopSlotKind({
      place,
      index,
      totalStops,
      lunchPlaceId,
      dinnerPlaceId,
    });
    return slotKind !== "default";
  });
  let anchorLimitMinutes = LATEST_DAY_START_MINUTES;

  if (firstAnchoredIndex >= 0) {
    const anchorPlace = orderedPlaces[firstAnchoredIndex]!;
    const anchorSlotKind = resolveStopSlotKind({
      place: anchorPlace,
      index: firstAnchoredIndex,
      totalStops,
      lunchPlaceId,
      dinnerPlaceId,
    });
    const anchorSlotMinutes =
      anchorSlotKind === "lunch"
        ? LUNCH_SLOT_MINUTES
        : anchorSlotKind === "dinner"
          ? DINNER_SLOT_MINUTES
          : NIGHT_SLOT_MINUTES;
    let minutesUntilAnchor = 0;

    for (let index = 0; index < firstAnchoredIndex; index += 1) {
      const currentPlace = orderedPlaces[index]!;
      const previous = orderedPlaces[index - 1];
      const slotKind = resolveStopSlotKind({
        place: currentPlace,
        index,
        totalStops,
        lunchPlaceId,
        dinnerPlaceId,
      });

      if (previous) {
        minutesUntilAnchor += buildTransitLeg(previous, currentPlace, locale, "fallback", preferences.mobilityMode).durationMinutes;
      }

      minutesUntilAnchor += resolveStayMinutes({
        place: currentPlace,
        preferences,
        slotKind,
        weatherSnapshot,
      });

      if (index < firstAnchoredIndex - 1) {
        minutesUntilAnchor += resolvePostStopBufferMinutes(slotKind);
      }
    }

    anchorLimitMinutes = Math.min(LATEST_DAY_START_MINUTES, anchorSlotMinutes - minutesUntilAnchor);
  }

  const initialStartMinutes = Math.max(
    DAY_START_MINUTES,
    Math.min(targetEndMinutes - estimatedRouteMinutes, anchorLimitMinutes, LATEST_DAY_START_MINUTES)
  );
  let cursor = addMinutes(dayStart, initialStartMinutes);

  return orderedPlaces.map((place, index) => {
    const previous = orderedPlaces[index - 1];
    const transit = previous
      ? buildTransitLeg(previous, place, locale, "fallback", preferences.mobilityMode)
      : undefined;
    const slotKind = resolveStopSlotKind({
      place,
      index,
      totalStops,
      lunchPlaceId,
      dinnerPlaceId,
    });

    if (transit) {
      cursor = addMinutes(cursor, transit.durationMinutes);
    }

    if (slotKind === "lunch") {
      cursor = alignCursorToMinutes(cursor, dayStart, LUNCH_SLOT_MINUTES);
    } else if (slotKind === "dinner") {
      cursor = alignCursorToMinutes(cursor, dayStart, DINNER_SLOT_MINUTES);
    } else if (slotKind === "night") {
      cursor = alignCursorToMinutes(cursor, dayStart, NIGHT_SLOT_MINUTES);
    }

    const startTime = formatISO(cursor);
    cursor = addMinutes(
      cursor,
      resolveStayMinutes({
        place,
        preferences,
        slotKind,
        weatherSnapshot,
      })
    );
    const endTime = formatISO(cursor);

    if (index < totalStops - 1) {
      cursor = addMinutes(cursor, resolvePostStopBufferMinutes(slotKind));
    }

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

const buildRouteLegDebug = (days: ItineraryDay[]): PlannerRouteLegDebug[] =>
  days.flatMap((day) =>
    day.stops.map((stop, index) => {
      const previous = day.stops[index - 1];
      return {
        dayNumber: day.dayNumber,
        order: stop.order,
        fromPlace: previous?.place.name,
        toPlace: stop.place.name,
        durationMinutes: stop.transitFromPrevious?.durationMinutes,
        distanceKm: stop.transitFromPrevious?.distanceKm,
        estimatedFareKrw: stop.transitFromPrevious?.estimatedFareKrw,
        provider: stop.transitFromPrevious?.provider,
      };
    })
  );

const buildPlanningDebug = ({
  engine,
  preferences,
  weatherSnapshot,
  scored,
  budgetSelection,
  selectedStrategy,
  finalPlaces,
  days,
  estimatedTotalKrw,
  lodging,
}: {
  engine: PlannerEngine;
  preferences: TripPreferences;
  weatherSnapshot: WeatherSnapshot;
  scored: ScoredPlace[];
  budgetSelection: {
    places: ScoredPlace[];
    strategy: "within" | "minimum";
  };
  selectedStrategy: "within" | "minimum";
  finalPlaces: ScoredPlace[];
  days: ItineraryDay[];
  estimatedTotalKrw: number;
  lodging?: LodgingSummary;
}): PlanningDebug => {
  const budgetSelectedIds = new Set(budgetSelection.places.map((place) => place.id));
  const finalIds = new Set(finalPlaces.map((place) => place.id));
  const routeOrder = new Map(finalPlaces.map((place, index) => [place.id, index + 1]));
  const routeLegs = buildRouteLegDebug(days);
  const liveTransitLegCount = routeLegs.filter((leg) => leg.provider === "odsay").length;
  const fallbackTransitLegCount = routeLegs.filter((leg) => leg.provider === "fallback").length;
  const candidatePlaces: PlannerCandidateDebug[] = scored.map((place) => ({
    placeId: place.id,
    name: place.name,
    score: Number(place.score.toFixed(2)),
    estimatedSpendKrw: place.estimatedSpendKrw,
    priceLevel: place.priceLevel,
    indoor: place.indoor,
    accessibility: place.accessibility,
    distanceFromStartKm: place.distanceFromStartKm,
    selected: finalIds.has(place.id),
    routeOrder: routeOrder.get(place.id),
    selectionStage: finalIds.has(place.id)
      ? "final"
      : budgetSelectedIds.has(place.id)
        ? "trimmed"
        : "not-selected",
    scoreBreakdown: place.scoreBreakdown,
  }));
  const trimmedCount = candidatePlaces.filter((candidate) => candidate.selectionStage === "trimmed").length;

  return {
    engine,
    routeResolvedWithoutFallback: false,
    withinBudget: estimatedTotalKrw <= preferences.totalBudgetKrw,
    trimmedToBudget: trimmedCount > 0,
    selectedStrategy,
    targetStopCount: targetStopCount(preferences.tripDays, scored.length),
    minimumStopCount: minimumStopCount(preferences.tripDays, scored.length),
    finalStopCount: finalPlaces.length,
    placesSource: "seed",
    weatherSource: weatherSnapshot.source,
    liveTransitLegCount,
    fallbackTransitLegCount,
    weatherValues: weatherSnapshot,
    candidatePlaces,
    routeLegs,
    notes: [
      `${engine} planner debug snapshot`,
      `Selection strategy ${selectedStrategy}`,
      "Timed with lunch, dinner, and evening anchors when available.",
      getLodgingTotalKrw(lodging) > 0
        ? `Lodging estimate added: ${getLodgingTotalKrw(lodging)} KRW.`
        : "No lodging estimate added.",
      trimmedCount > 0 ? `${trimmedCount} budget-selected candidates were trimmed.` : "No route trimming was required.",
    ],
  };
};

const buildPlanningMeta = ({
  days,
  preferences,
  startArea,
  weatherSnapshot,
  strategy,
  lodging,
}: {
  days: ItineraryDay[];
  preferences: TripPreferences;
  startArea: StartArea;
  weatherSnapshot: WeatherSnapshot;
  strategy: "within" | "minimum";
  lodging?: LodgingSummary;
}) => {
  const estimatedRouteKrw = Math.round(days.reduce((total, day) => total + sumDayCost(day, preferences.partySize), 0));
  const estimatedTotalKrw = estimatedRouteKrw + getLodgingTotalKrw(lodging);

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
    lodging,
  };
};

const trimRouteToBudget = ({
  places,
  preferences,
  startArea,
  locale,
  weatherSnapshot,
  lodging,
}: {
  places: ScoredPlace[];
  preferences: TripPreferences;
  startArea: StartArea;
  locale: AppLocale;
  weatherSnapshot: WeatherSnapshot;
  lodging?: LodgingSummary;
}) => {
  const minimumStops = minimumStopCount(preferences.tripDays, places.length);
  let working = [...places];
  let strategy: "within" | "minimum" = "within";

  while (working.length >= minimumStops) {
    const dayBuckets = chunkByDays(working, Math.min(preferences.tripDays, working.length));
    const days = dayBuckets.map((bucket, index) => ({
      dayNumber: index + 1,
      theme: dayTheme(bucket),
      stops: createDayStops(bucket, index, preferences, locale, weatherSnapshot),
    }));
    const planningMeta = buildPlanningMeta({
      days,
      preferences,
      startArea,
      weatherSnapshot,
      strategy,
      lodging,
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
    engine?: PlannerEngine;
    lodging?: LodgingSummary;
  }
): Itinerary => {
  const normalizedPreferences = normalizeTripPreferences(preferences);
  const locale = normalizedPreferences.locale;
  const startArea = planningInput?.startArea ?? getStartAreaOrDefault(normalizedPreferences.startAreaId);
  const weatherSnapshot = planningInput?.weatherSnapshot ?? neutralWeatherSnapshot(normalizedPreferences.travelDate);
  const engine = planningInput?.engine ?? "local-fallback";
  const lodging = planningInput?.lodging;
  const scored = scorePlaces(normalizedPreferences, candidatePlaces, { weatherSnapshot, startArea });
  const budgetSelection = selectPlacesWithinBudget(scored, normalizedPreferences, lodging);
  const orderedSelection = orderPlacesForRoute(budgetSelection.places, startArea);
  const trimmedSelection = trimRouteToBudget({
    places: orderedSelection,
    preferences: normalizedPreferences,
    startArea,
    locale,
    weatherSnapshot,
    lodging,
  });
  const finalStrategy =
    budgetSelection.strategy === "minimum" || trimmedSelection.strategy === "minimum" ? "minimum" : "within";
  const dayBuckets = chunkByDays(trimmedSelection.places, Math.min(normalizedPreferences.tripDays, trimmedSelection.places.length));
  const days: ItineraryDay[] = dayBuckets.map((bucket, index) => ({
    dayNumber: index + 1,
    theme: dayTheme(bucket),
    stops: createDayStops(bucket, index, normalizedPreferences, locale, weatherSnapshot),
  }));
  const planningMeta = buildPlanningMeta({
    days,
    preferences: normalizedPreferences,
    startArea,
    weatherSnapshot,
    strategy: finalStrategy,
    lodging,
  });
  const planningDebug = buildPlanningDebug({
    engine,
    preferences: normalizedPreferences,
    weatherSnapshot,
    scored,
    budgetSelection,
    selectedStrategy: finalStrategy,
    finalPlaces: trimmedSelection.places,
    days,
    estimatedTotalKrw: planningMeta.budgetSummary.estimatedTotalKrw,
    lodging,
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
    planningMeta: {
      ...planningMeta,
      debug: planningDebug,
    },
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
      engine: "indoor-fallback",
      lodging: itinerary.planningMeta?.lodging,
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
