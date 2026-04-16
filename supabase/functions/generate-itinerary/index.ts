import { corsHeaders, json } from "../_shared/cors.ts";

type LocalizedText = {
  ko: string;
  en: string;
};

type Coordinates = {
  latitude: number;
  longitude: number;
};

type StartArea = {
  id: string;
  name: LocalizedText;
  district: LocalizedText;
  coordinates: Coordinates;
};

type WeatherSnapshot = {
  status: "live" | "unavailable";
  source: "open-meteo" | "fallback";
  date: string;
  signal: "clear" | "mixed" | "rainy" | "heat" | "cold";
  summary: LocalizedText;
  weatherCode?: number;
  temperatureMaxC?: number;
  temperatureMinC?: number;
  precipitationProbabilityMax?: number;
};

type Place = {
  id: string;
  slug: string;
  district: string;
  categories: string[];
  name: LocalizedText;
  description: LocalizedText;
  signatureStory: LocalizedText;
  coordinates: Coordinates;
  indoor: boolean;
  accessibility: boolean;
  recommendedStayMinutes: number;
  popularity: number;
  crowdBase: number;
  priceLevel: "value" | "balanced" | "premium";
  estimatedSpendKrw: number;
  bookingLabel?: LocalizedText;
  bookingUrl?: string;
};

type Preferences = {
  tripDays: number;
  totalBudgetKrw: number;
  partySize: number;
  travelDate: string;
  startAreaId: string;
  locale: "ko" | "en";
  companionType: "solo" | "couple" | "family" | "friends";
  interests: string[];
  budgetLevel: "value" | "balanced" | "premium";
  mobilityMode: "transit" | "walk" | "mixed";
  accessibilityNeeds: boolean;
  indoorFallback: boolean;
};

type PlannerDebug = {
  engine: "remote-ai";
  routeResolvedWithoutFallback: boolean;
  withinBudget: boolean;
  trimmedToBudget: boolean;
  selectedStrategy: "within" | "minimum";
  targetStopCount: number;
  minimumStopCount: number;
  finalStopCount: number;
  placesSource: "live" | "seed" | "mixed";
  weatherSource: WeatherSnapshot["source"];
  liveTransitLegCount: number;
  fallbackTransitLegCount: number;
  weatherValues: WeatherSnapshot;
  candidatePlaces: Array<{
    placeId: string;
    name: LocalizedText;
    score: number;
    estimatedSpendKrw: number;
    priceLevel: Place["priceLevel"];
    indoor: boolean;
    accessibility: boolean;
    distanceFromStartKm: number;
    selected: boolean;
    routeOrder?: number;
    selectionStage: "final" | "budget-selected" | "trimmed" | "not-selected";
    scoreBreakdown: Record<string, number>;
  }>;
  routeLegs: Array<{
    dayNumber: number;
    order: number;
    fromPlace?: LocalizedText;
    toPlace: LocalizedText;
    durationMinutes?: number;
    distanceKm?: number;
    estimatedFareKrw?: number;
    provider?: "odsay" | "fallback";
  }>;
  notes: string[];
};

const makeBudgetLabel = (budgetLevel: Preferences["budgetLevel"]) =>
  budgetLevel === "value"
    ? { ko: "1인 4만~7만 원", en: "KRW 40k-70k per person" }
    : budgetLevel === "premium"
      ? { ko: "1인 12만 원 이상", en: "KRW 120k+ per person" }
      : { ko: "1인 7만~12만 원", en: "KRW 70k-120k per person" };

const formatKrwCompact = (value: number, locale: "ko" | "en") => {
  if (locale === "ko") {
    if (value >= 10000) {
      return `${Math.round((value / 10000) * 10) / 10}만원`;
    }

    return `${Math.round(value)}원`;
  }

  if (value >= 1000) {
    return `KRW ${Math.round((value / 1000) * 10) / 10}k`;
  }

  return `KRW ${Math.round(value)}`;
};

const estimateTransitFareKrw = (distanceKm: number, mobilityMode: Preferences["mobilityMode"]) => {
  if (distanceKm < 1.3 || mobilityMode === "walk") {
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

const estimateDistanceKm = (from: Coordinates, to: Coordinates) => {
  const latDiffKm = Math.abs(from.latitude - to.latitude) * 111;
  const lngDiffKm = Math.abs(from.longitude - to.longitude) * 91;
  return Math.round(Math.sqrt(latDiffKm ** 2 + lngDiffKm ** 2) * 10) / 10;
};

const buildTransitLeg = ({
  from,
  to,
  locale,
  mobilityMode,
}: {
  from: Place;
  to: Place;
  locale: "ko" | "en";
  mobilityMode: Preferences["mobilityMode"];
}) => {
  const distanceKm = estimateDistanceKm(from.coordinates, to.coordinates);
  const estimatedFareKrw = estimateTransitFareKrw(distanceKm, mobilityMode);
  const durationMinutes =
    distanceKm < 1.3 ? Math.max(12, Math.round(distanceKm * 18)) : Math.round(distanceKm * 9 + 14);
  const naverLink = `nmap://route/public?dlat=${to.coordinates.latitude}&dlng=${to.coordinates.longitude}&dname=${encodeURIComponent(to.name.ko)}`;

  return {
    fromPlaceId: from.id,
    toPlaceId: to.id,
    summary: {
      ko:
        distanceKm < 1.3 || mobilityMode === "walk"
          ? `${from.name.ko}에서 ${to.name.ko}까지 도보 이동`
          : `${from.name.ko}에서 ${to.name.ko}까지 대중교통 이동`,
      en:
        distanceKm < 1.3 || mobilityMode === "walk"
          ? `Walk from ${from.name.en} to ${to.name.en}`
          : `Transit from ${from.name.en} to ${to.name.en}`,
    },
    durationMinutes,
    distanceKm,
    estimatedFareKrw,
    provider: "fallback",
    steps:
      distanceKm < 1.3 || mobilityMode === "walk"
        ? [
            {
              mode: "walk",
              label: {
                ko: `도보 ${durationMinutes}분 이동`,
                en: `Walk for about ${durationMinutes} min`,
              },
            },
          ]
        : [
            {
              mode: "metro",
              label: {
                ko: "지하철 1회 환승 추천",
                en: "Recommended with one metro transfer",
              },
            },
          ],
    navigationLinks: {
      appleMaps: `https://maps.apple.com/?ll=${to.coordinates.latitude},${to.coordinates.longitude}`,
      googleMaps: `https://maps.google.com/?q=${to.coordinates.latitude},${to.coordinates.longitude}`,
      naverMap: naverLink,
      kakaoMap: `kakaomap://look?p=${to.coordinates.latitude},${to.coordinates.longitude}`,
      tMap: `tmap://route?goalx=${to.coordinates.longitude}&goaly=${to.coordinates.latitude}`,
    },
  };
};

const weatherScore = (place: Place, weatherSnapshot: WeatherSnapshot) => {
  switch (weatherSnapshot.signal) {
    case "rainy":
      return (place.indoor ? 18 : -8) + (place.accessibility ? 4 : 0);
    case "clear":
      return place.categories.includes("nature") || place.categories.includes("photospot") ? 14 : 2;
    case "heat":
      return (place.indoor ? 14 : -3) + (place.accessibility ? 4 : 0);
    case "cold":
      return place.indoor ? 12 : 1;
    default:
      return place.indoor ? 5 : 4;
  }
};

const distanceFromStartKm = (place: Place, startArea: StartArea) =>
  Number(estimateDistanceKm(startArea.coordinates, place.coordinates).toFixed(1));

const buildScoreBreakdown = (
  place: Place,
  preferences: Preferences,
  weatherSnapshot: WeatherSnapshot,
  startArea: StartArea
) => {
  const interest = place.categories.reduce(
    (total, category) => total + (preferences.interests.includes(category) ? 16 : 0),
    0
  );
  const budget = place.priceLevel === preferences.budgetLevel ? 10 : 4;
  const accessibility = preferences.accessibilityNeeds ? (place.accessibility ? 18 : -16) : 6;
  const weather = weatherScore(place, weatherSnapshot);
  const distanceKm = estimateDistanceKm(startArea.coordinates, place.coordinates);
  const distance = distanceKm < 3 ? 10 : distanceKm < 8 ? 5 : 1;
  const popularity = Number((place.popularity * 0.3).toFixed(2));

  return {
    interest,
    budget,
    accessibility,
    weather,
    distance,
    popularity,
  };
};

const scorePlace = (place: Place, preferences: Preferences, weatherSnapshot: WeatherSnapshot, startArea: StartArea) => {
  return Object.values(buildScoreBreakdown(place, preferences, weatherSnapshot, startArea)).reduce(
    (total, value) => total + value,
    0
  );
};

const minimumStopCount = (tripDays: number, totalPlaces: number) =>
  Math.min(totalPlaces, Math.max(tripDays, Math.min(3, totalPlaces)));

const selectPlaces = (places: Place[], preferences: Preferences, weatherSnapshot: WeatherSnapshot, startArea: StartArea) => {
  const targetCount = Math.min(places.length, Math.max(4, preferences.tripDays * 3));
  const minimumCount = minimumStopCount(preferences.tripDays, places.length);
  const ranked = [...places].sort(
    (left, right) =>
      scorePlace(right, preferences, weatherSnapshot, startArea) -
      scorePlace(left, preferences, weatherSnapshot, startArea)
  );
  const selected: Place[] = [];
  let estimatedTotal = 0;

  for (const place of ranked) {
    if (selected.length >= targetCount) {
      break;
    }

    const additionalCost =
      place.estimatedSpendKrw * preferences.partySize +
      (selected.length > 0 ? 1600 * preferences.partySize : 0);

    if (estimatedTotal + additionalCost <= preferences.totalBudgetKrw) {
      selected.push(place);
      estimatedTotal += additionalCost;
    }
  }

  if (selected.length >= minimumCount) {
    return {
      places: selected,
      strategy: "within" as const,
    };
  }

  return {
    places: [...places]
      .sort((left, right) => left.estimatedSpendKrw - right.estimatedSpendKrw)
      .slice(0, minimumCount),
    strategy: "minimum" as const,
  };
};

const chunkByDays = (places: Place[], tripDays: number) => {
  const buckets: Place[][] = [];
  const baseSize = Math.floor(places.length / tripDays);
  const remainder = places.length % tripDays;
  let cursor = 0;

  for (let index = 0; index < tripDays; index += 1) {
    const sliceSize = baseSize + (index < remainder ? 1 : 0);
    const next = places.slice(cursor, cursor + Math.max(1, sliceSize));
    if (next.length > 0) {
      buckets.push(next);
    }
    cursor += Math.max(1, sliceSize);
  }

  return buckets;
};

const buildPlanningDebug = ({
  preferences,
  places,
  selectedPlaces,
  days,
  startArea,
  weatherSnapshot,
  estimatedTotalKrw,
  strategy,
}: {
  preferences: Preferences;
  places: Place[];
  selectedPlaces: Place[];
  days: Array<{
    dayNumber: number;
    stops: Array<{
      order: number;
      place: Place;
      transitFromPrevious?: {
        durationMinutes: number;
        distanceKm: number;
        estimatedFareKrw: number;
        provider: "odsay" | "fallback";
      };
    }>;
  }>;
  startArea: StartArea;
  weatherSnapshot: WeatherSnapshot;
  estimatedTotalKrw: number;
  strategy: "within" | "minimum";
}): PlannerDebug => {
  const selectedIds = new Set(selectedPlaces.map((place) => place.id));
  const routeOrder = new Map(selectedPlaces.map((place, index) => [place.id, index + 1]));
  const routeLegs = days.flatMap((day) =>
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
  const fallbackTransitLegCount = routeLegs.filter((leg) => leg.provider === "fallback").length;

  return {
    engine: "remote-ai",
    routeResolvedWithoutFallback: false,
    withinBudget: estimatedTotalKrw <= preferences.totalBudgetKrw,
    trimmedToBudget: false,
    selectedStrategy: strategy,
    targetStopCount: Math.min(places.length, Math.max(4, preferences.tripDays * 3)),
    minimumStopCount: minimumStopCount(preferences.tripDays, places.length),
    finalStopCount: selectedPlaces.length,
    placesSource: "mixed",
    weatherSource: weatherSnapshot.source,
    liveTransitLegCount: 0,
    fallbackTransitLegCount,
    weatherValues: weatherSnapshot,
    candidatePlaces: [...places]
      .sort(
        (left, right) =>
          scorePlace(right, preferences, weatherSnapshot, startArea) -
          scorePlace(left, preferences, weatherSnapshot, startArea)
      )
      .map((place) => ({
        placeId: place.id,
        name: place.name,
        score: Number(scorePlace(place, preferences, weatherSnapshot, startArea).toFixed(2)),
        estimatedSpendKrw: place.estimatedSpendKrw,
        priceLevel: place.priceLevel,
        indoor: place.indoor,
        accessibility: place.accessibility,
        distanceFromStartKm: distanceFromStartKm(place, startArea),
        selected: selectedIds.has(place.id),
        routeOrder: routeOrder.get(place.id),
        selectionStage: selectedIds.has(place.id) ? "final" : "not-selected",
        scoreBreakdown: buildScoreBreakdown(place, preferences, weatherSnapshot, startArea),
      })),
    routeLegs,
    notes: [
      "remote-ai planner debug snapshot",
      `Selection strategy ${strategy}`,
      "Fallback-free status is resolved on the client after live transit enrichment.",
    ],
  };
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const { preferences, places = [], startArea, weatherSnapshot } = (await request.json()) as {
    preferences: Preferences;
    places: Place[];
    startArea: StartArea;
    weatherSnapshot: WeatherSnapshot;
  };

  const selected = selectPlaces(places, preferences, weatherSnapshot, startArea);
  const days = chunkByDays(selected.places, Math.min(preferences.tripDays, selected.places.length)).map(
    (dayStops, index) => {
      const dayDate = new Date(`${preferences.travelDate}T09:00:00+09:00`);
      dayDate.setDate(dayDate.getDate() + index);
      const dayDateLabel = dayDate.toISOString().slice(0, 10);

      return {
        dayNumber: index + 1,
        theme: {
          ko: weatherSnapshot.signal === "rainy" ? "실내 우선 루트" : "예산 맞춤 부산 루트",
          en: weatherSnapshot.signal === "rainy" ? "Indoor-first route" : "Budget-aware Busan route",
        },
        stops: dayStops.map((place, order) => {
          const previous = dayStops[order - 1];
          const transitFromPrevious = previous
            ? buildTransitLeg({
                from: previous,
                to: place,
                locale: preferences.locale,
                mobilityMode: preferences.mobilityMode,
              })
            : undefined;

          return {
            id: `${place.id}-${order}`,
            order: order + 1,
            date: dayDateLabel,
            startTime: `${dayDateLabel}T${String(Math.min(9 + order * 2, 22)).padStart(2, "0")}:00:00+09:00`,
            endTime: `${dayDateLabel}T${String(Math.min(10 + order * 2, 23)).padStart(2, "0")}:00:00+09:00`,
            highlight: {
              ko: `${place.district} 핵심 스팟`,
              en: `Top stop in ${place.district}`,
            },
            note: {
              ko: place.indoor
                ? "날씨 변화에도 안정적으로 들르기 좋은 실내 스팟이에요."
                : "현장 상황에 따라 체류 시간을 조금 조정해도 좋아요.",
              en: place.indoor
                ? "An indoor-friendly stop that stays reliable in changing weather."
                : "You can trim the stay slightly if live conditions change.",
            },
            place,
            transitFromPrevious,
          };
        }),
      };
    }
  );

  const estimatedTotalKrw = Math.round(
    days.reduce(
      (total, day) =>
        total +
        day.stops.reduce(
          (dayTotal, stop) =>
            dayTotal +
            stop.place.estimatedSpendKrw * preferences.partySize +
            (stop.transitFromPrevious?.estimatedFareKrw ?? 0) * preferences.partySize,
          0
        ),
      0
    )
  );
  const finalStrategy =
    selected.strategy === "minimum" || estimatedTotalKrw > preferences.totalBudgetKrw ? "minimum" : "within";
  const planningDebug = buildPlanningDebug({
    preferences,
    places,
    selectedPlaces: selected.places,
    days,
    startArea,
    weatherSnapshot,
    estimatedTotalKrw,
    strategy: finalStrategy,
  });

  return json({
    itinerary: {
      id: crypto.randomUUID(),
      routeSlug: `busan-${startArea.id}`,
      title: {
        ko: `${startArea.name.ko} 출발 부산 루트`,
        en: `Busan route from ${startArea.name.en}`,
      },
      summary: {
        ko:
          selected.strategy === "minimum"
            ? `${startArea.name.ko} 출발 기준으로 예산을 최대한 맞춘 최저 예산 경로예요.`
            : `${startArea.name.ko} 출발 기준으로 예산과 날씨를 함께 반영한 경로예요.`,
        en:
          selected.strategy === "minimum"
            ? `A lowest-cost route from ${startArea.name.en} built for a very tight budget.`
            : `A route from ${startArea.name.en} shaped by budget and weather.`,
      },
      createdAt: new Date().toISOString(),
      locale: preferences.locale,
      source: "ai",
      shareStatus: "private",
      syncStatus: "synced",
      preferences,
      days,
      ratingAverage: 4.7,
      estimatedBudgetLabel: makeBudgetLabel(preferences.budgetLevel),
      planningMeta: {
        startArea,
        weatherSnapshot,
        budgetSummary: {
          totalBudgetKrw: preferences.totalBudgetKrw,
          estimatedTotalKrw,
          estimatedPerPersonKrw: Math.round(estimatedTotalKrw / Math.max(1, preferences.partySize)),
          remainingBudgetKrw: preferences.totalBudgetKrw - estimatedTotalKrw,
          strategy: finalStrategy,
          summary:
            finalStrategy === "minimum"
              ? {
                  ko: `예산 ${formatKrwCompact(preferences.totalBudgetKrw, "ko")} 기준 최저 예산 경로예요.`,
                  en: `Built the lowest-cost route for ${formatKrwCompact(preferences.totalBudgetKrw, "en")}.`,
                }
              : {
                  ko: `예산 ${formatKrwCompact(preferences.totalBudgetKrw, "ko")} 중 예상 ${formatKrwCompact(estimatedTotalKrw, "ko")}`,
                  en: `${formatKrwCompact(estimatedTotalKrw, "en")} estimated out of ${formatKrwCompact(
                    preferences.totalBudgetKrw,
                    "en"
                  )}`,
                },
        },
        debug: planningDebug,
      },
    },
  });
});
