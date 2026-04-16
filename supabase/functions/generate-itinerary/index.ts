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

type LodgingSummary = {
  source: "visit-korea" | "fallback" | "none";
  nights: number;
  estimatedNightlyRateKrw: number;
  estimatedRoomCount: number;
  estimatedTotalKrw: number;
  propertyName?: LocalizedText;
  district?: string;
  coordinates?: Coordinates;
  bookingUrl?: string;
  checkInTime?: string;
  checkOutTime?: string;
  note?: LocalizedText;
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
  mobilityMode: "transit" | "walk" | "mixed" | "car";
  accessibilityNeeds: boolean;
  indoorFallback: boolean;
  includeLodgingCost: boolean;
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

type StopSlotKind = "default" | "lunch" | "dinner" | "night";

const DAY_START_MINUTES = 9 * 60;
const LATEST_DAY_START_MINUTES = 15 * 60;
const LUNCH_SLOT_MINUTES = 12 * 60 + 30;
const DINNER_SLOT_MINUTES = 18 * 60 + 30;
const NIGHT_SLOT_MINUTES = 19 * 60;

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

  if (mobilityMode === "car") {
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
  mobilityMode: Preferences["mobilityMode"]
) => {
  if (distanceKm < 1.3 || mobilityMode === "walk") {
    return Math.max(12, Math.round(distanceKm * 18));
  }

  if (mobilityMode === "car") {
    return Math.max(8, Math.round(distanceKm * 4 + 8));
  }

  return Math.round(distanceKm * 9 + 14);
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
  const durationMinutes = resolveTransitDurationMinutes(distanceKm, mobilityMode);
  const naverLink = `nmap://route/public?dlat=${to.coordinates.latitude}&dlng=${to.coordinates.longitude}&dname=${encodeURIComponent(to.name.ko)}`;

  return {
    fromPlaceId: from.id,
    toPlaceId: to.id,
    summary: {
      ko:
        distanceKm < 1.3 || mobilityMode === "walk"
          ? `${from.name.ko}에서 ${to.name.ko}까지 도보 이동`
          : mobilityMode === "car"
            ? `${from.name.ko}에서 ${to.name.ko}까지 자차 이동`
            : `${from.name.ko}에서 ${to.name.ko}까지 대중교통 이동`,
      en:
        distanceKm < 1.3 || mobilityMode === "walk"
          ? `Walk from ${from.name.en} to ${to.name.en}`
          : mobilityMode === "car"
            ? `Drive from ${from.name.en} to ${to.name.en}`
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
        : mobilityMode === "car"
          ? [
              {
                mode: "car",
                label: {
                  ko: `자차 ${durationMinutes}분 이동`,
                  en: `Drive for about ${durationMinutes} min`,
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

const getLodgingTotalKrw = (lodging?: LodgingSummary) => lodging?.estimatedTotalKrw ?? 0;

const selectPlaces = (
  places: Place[],
  preferences: Preferences,
  weatherSnapshot: WeatherSnapshot,
  startArea: StartArea,
  lodging?: LodgingSummary
) => {
  const targetCount = Math.min(places.length, Math.max(4, preferences.tripDays * 3));
  const minimumCount = minimumStopCount(preferences.tripDays, places.length);
  const availableBudgetKrw = Math.max(0, preferences.totalBudgetKrw - getLodgingTotalKrw(lodging));
  const ranked = [...places].sort(
    (left, right) =>
      scorePlace(right, preferences, weatherSnapshot, startArea) -
      scorePlace(left, preferences, weatherSnapshot, startArea)
  );
  const selected: Place[] = [];
  let estimatedTotal = 0;
  const baseTransitCostPerLeg =
    preferences.mobilityMode === "walk" || preferences.mobilityMode === "car"
      ? 0
      : 1600 * preferences.partySize;

  for (const place of ranked) {
    if (selected.length >= targetCount) {
      break;
    }

    const additionalCost =
      place.estimatedSpendKrw * preferences.partySize +
      (selected.length > 0 ? baseTransitCostPerLeg : 0);

    if (estimatedTotal + additionalCost <= availableBudgetKrw) {
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

const resolveTargetEndMinutes = (places: Place[], preferences: Preferences) => {
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
  preferences: Preferences;
  slotKind: StopSlotKind;
  weatherSnapshot: WeatherSnapshot;
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

  if (weatherSnapshot.signal === "clear" && place.categories.includes("nature")) {
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

const toIsoAtMinutes = (dayDateLabel: string, minutes: number) => {
  const clampedMinutes = Math.max(0, Math.min(minutes, 23 * 60 + 59));
  const hours = Math.floor(clampedMinutes / 60);
  const mins = clampedMinutes % 60;
  return `${dayDateLabel}T${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}:00+09:00`;
};

const scheduleDayStops = ({
  places,
  dayNumber,
  dayDateLabel,
  preferences,
  weatherSnapshot,
}: {
  places: Place[];
  dayNumber: number;
  dayDateLabel: string;
  preferences: Preferences;
  weatherSnapshot: WeatherSnapshot;
}) => {
  const orderedPlaces = arrangePlacesForDaySchedule(places);
  const { lunchPlaceId, dinnerPlaceId } = resolveMealAnchors(orderedPlaces);
  const totalStops = orderedPlaces.length;
  const targetEndMinutes = resolveTargetEndMinutes(orderedPlaces, preferences);
  const estimatedRouteMinutes = orderedPlaces.reduce((total, place, index) => {
    const previous = orderedPlaces[index - 1];
    const transitDurationMinutes = previous
      ? buildTransitLeg({
          from: previous,
          to: place,
          locale: preferences.locale,
          mobilityMode: preferences.mobilityMode,
        }).durationMinutes
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
        minutesUntilAnchor += buildTransitLeg({
          from: previous,
          to: currentPlace,
          locale: preferences.locale,
          mobilityMode: preferences.mobilityMode,
        }).durationMinutes;
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

  let cursorMinutes = Math.max(
    DAY_START_MINUTES,
    Math.min(targetEndMinutes - estimatedRouteMinutes, anchorLimitMinutes, LATEST_DAY_START_MINUTES)
  );

  return orderedPlaces.map((place, order) => {
    const previous = orderedPlaces[order - 1];
    const transitFromPrevious = previous
      ? buildTransitLeg({
          from: previous,
          to: place,
          locale: preferences.locale,
          mobilityMode: preferences.mobilityMode,
        })
      : undefined;
    const slotKind = resolveStopSlotKind({
      place,
      index: order,
      totalStops,
      lunchPlaceId,
      dinnerPlaceId,
    });

    if (transitFromPrevious) {
      cursorMinutes += transitFromPrevious.durationMinutes;
    }

    if (slotKind === "lunch" && cursorMinutes < LUNCH_SLOT_MINUTES) {
      cursorMinutes = LUNCH_SLOT_MINUTES;
    } else if (slotKind === "dinner" && cursorMinutes < DINNER_SLOT_MINUTES) {
      cursorMinutes = DINNER_SLOT_MINUTES;
    } else if (slotKind === "night" && cursorMinutes < NIGHT_SLOT_MINUTES) {
      cursorMinutes = NIGHT_SLOT_MINUTES;
    }

    const startTime = toIsoAtMinutes(dayDateLabel, cursorMinutes);
    cursorMinutes += resolveStayMinutes({
      place,
      preferences,
      slotKind,
      weatherSnapshot,
    });
    const endTime = toIsoAtMinutes(dayDateLabel, cursorMinutes);

    if (order < totalStops - 1) {
      cursorMinutes += resolvePostStopBufferMinutes(slotKind);
    }

    return {
      id: `${place.id}-${dayNumber}-${order}`,
      order: order + 1,
      date: dayDateLabel,
      startTime,
      endTime,
      highlight: {
        ko: `${place.district} 핵심 스팟`,
        en:
          slotKind === "lunch"
            ? `Lunch stop in ${place.district}`
            : slotKind === "dinner"
              ? `Dinner stop in ${place.district}`
              : slotKind === "night"
                ? `Evening stop in ${place.district}`
                : `Top stop in ${place.district}`,
      },
      note: {
        ko: place.indoor
          ? "날씨 변화에도 안정적으로 들르기 좋은 실내 스팟이에요."
          : "현장 상황에 따라 체류 시간을 조금 조정해도 좋아요.",
        en:
          slotKind === "lunch"
            ? "Scheduled around lunch so the route has a natural midday break."
            : slotKind === "dinner"
              ? "Placed near dinner time so the evening does not finish too early."
              : slotKind === "night"
                ? "Held for the evening so the final stop lands after sunset."
                : place.indoor
                  ? "An indoor-friendly stop that stays reliable in changing weather."
                  : "You can trim the stay slightly if live conditions change.",
      },
      place,
      transitFromPrevious,
    };
  });
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
  lodging,
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
  lodging?: LodgingSummary;
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
      getLodgingTotalKrw(lodging) > 0
        ? `Lodging estimate added: ${getLodgingTotalKrw(lodging)} KRW.`
        : "No lodging estimate added.",
      "Fallback-free status is resolved on the client after live transit enrichment.",
    ],
  };
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const { preferences, places = [], startArea, weatherSnapshot, lodging } = (await request.json()) as {
    preferences: Preferences;
    places: Place[];
    startArea: StartArea;
    weatherSnapshot: WeatherSnapshot;
    lodging?: LodgingSummary;
  };

  const selected = selectPlaces(places, preferences, weatherSnapshot, startArea, lodging);
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
        stops: scheduleDayStops({
          places: dayStops,
          dayNumber: index + 1,
          dayDateLabel,
          preferences,
          weatherSnapshot,
        }),
      };
    }
  );

  const routeTotalKrw = Math.round(
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
  const estimatedTotalKrw = routeTotalKrw + getLodgingTotalKrw(lodging);
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
    lodging,
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
        lodging,
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
