import { addDays, addMinutes, formatISO } from "date-fns";
import { getDistance } from "geolib";

import { seedPlaces } from "../../data/seed";
import {
  AppLocale,
  Itinerary,
  ItineraryDay,
  ItineraryStop,
  Place,
  TransitLeg,
  TripPreferences,
} from "../../types/domain";
import { createId } from "../../utils/id";
import { buildNavigationLinks } from "../../utils/maps";
import { tText } from "../../utils/localized";
import { itinerarySchema } from "./schema";

type ScoredPlace = Place & { score: number };

const baseDate = new Date("2026-04-10T09:00:00+09:00");

export const scorePlaces = (preferences: TripPreferences, places = seedPlaces): ScoredPlace[] =>
  places
    .map((place) => {
      const interestScore = place.categories.reduce(
        (total, category) => total + (preferences.interests.includes(category) ? 16 : 0),
        0
      );
      const accessibilityScore = preferences.accessibilityNeeds
        ? place.accessibility
          ? 24
          : -18
        : 8;
      const fallbackScore = preferences.indoorFallback ? (place.indoor ? 18 : 4) : 0;
      const mobilityScore =
        preferences.mobilityMode === "walk"
          ? place.recommendedStayMinutes <= 80
            ? 10
            : 2
          : 12;
      const budgetScore = place.priceLevel === preferences.budgetLevel ? 10 : 4;
      const companionScore =
        preferences.companionType === "family"
          ? place.accessibility
            ? 12
            : 4
          : preferences.companionType === "couple"
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
          place.popularity * 0.35,
      };
    })
    .sort((left, right) => right.score - left.score);

export const buildTransitLeg = (
  fromPlace: Place,
  toPlace: Place,
  locale: AppLocale,
  provider: "odsay" | "fallback" = "fallback"
): TransitLeg => {
  const meters = getDistance(fromPlace.coordinates, toPlace.coordinates);
  const distanceKm = Number((meters / 1000).toFixed(1));
  const durationMinutes =
    distanceKm < 1.3 ? Math.max(12, Math.round(distanceKm * 18)) : Math.round(distanceKm * 9 + 14);

  const steps =
    distanceKm < 1.3
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
              ko: "역/정류장 도보 연결",
              en: "Short station-to-stop walk",
            },
          },
        ];

  return {
    fromPlaceId: fromPlace.id,
    toPlaceId: toPlace.id,
    summary: {
      ko:
        distanceKm < 1.3
          ? `${tText(fromPlace.name, locale)}에서 ${tText(toPlace.name, locale)}까지 도보 이동`
          : `${tText(fromPlace.name, locale)} -> ${tText(toPlace.name, locale)} 대중교통 이동`,
      en:
        distanceKm < 1.3
          ? `Walk from ${tText(fromPlace.name, locale)} to ${tText(toPlace.name, locale)}`
          : `Transit from ${tText(fromPlace.name, locale)} to ${tText(toPlace.name, locale)}`,
    },
    durationMinutes,
    distanceKm,
    provider,
    steps,
    navigationLinks: buildNavigationLinks(toPlace.coordinates),
  };
};

const chunkByDays = (places: Place[], tripDays: number) => {
  const buckets: Place[][] = Array.from({ length: tripDays }, () => []);
  places.forEach((place, index) => {
    buckets[index % tripDays]?.push(place);
  });
  return buckets.map((bucket) => bucket.slice(0, 4));
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
      ko: "바다와 전망 루트",
      en: "Sea and scenic route",
    };
  }

  if (hasFood) {
    return {
      ko: "로컬 감성 미식 루트",
      en: "Local food and culture route",
    };
  }

  return {
    ko: "부산 큐레이션 루트",
    en: "Curated Busan route",
  };
};

const createDayStops = (places: Place[], dayIndex: number, locale: AppLocale): ItineraryStop[] => {
  let cursor = addDays(baseDate, dayIndex);
  cursor = addMinutes(cursor, 30);

  return places.map((place, index) => {
    const previous = places[index - 1];
    const transit = previous ? buildTransitLeg(previous, place, locale) : undefined;

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
        ko: `${place.district} 대표 포인트`,
        en: `Key stop in ${place.district}`,
      },
      note: {
        ko: place.indoor
          ? "날씨 변수에 강한 실내/복합 동선입니다."
          : "현장 혼잡에 따라 체류 시간을 조금 줄여도 좋습니다.",
        en: place.indoor
          ? "An indoor-friendly stop that works well in changing weather."
          : "You can shorten this stop slightly if the area gets crowded.",
      },
      place,
      transitFromPrevious: transit,
    };
  });
};

export const buildFallbackItinerary = (
  preferences: TripPreferences,
  candidatePlaces = seedPlaces
): Itinerary => {
  const scored = scorePlaces(preferences, candidatePlaces);
  const selected = scored.slice(0, Math.max(4, preferences.tripDays * 3));
  const dayBuckets = chunkByDays(selected, preferences.tripDays);
  const locale = preferences.locale;

  const days: ItineraryDay[] = dayBuckets.map((bucket, index) => ({
    dayNumber: index + 1,
    theme: dayTheme(bucket),
    stops: createDayStops(bucket, index, locale),
  }));

  const titleAnchor = selected[0]?.name ?? { ko: "부산", en: "Busan" };
  const title = {
    ko: `${tText(titleAnchor, "ko")} 중심 ${preferences.tripDays}일 부산 루트`,
    en: `${preferences.tripDays}-day Busan route around ${tText(titleAnchor, "en")}`,
  };

  const summary = {
    ko: `${preferences.startDistrict} 출발 기준으로 이동 거리와 관심사를 반영한 개인 맞춤 일정입니다.`,
    en: `A personalized Busan route shaped by your interests, transport preference, and a start near ${preferences.startDistrict}.`,
  };

  return {
    id: createId(),
    syncStatus: "synced",
    routeSlug: `busan-${preferences.startDistrict.toLowerCase().replace(/\s+/g, "-")}-${createId(6)}`,
    title,
    summary,
    createdAt: formatISO(new Date()),
    locale,
    source: "fallback",
    shareStatus: "private",
    preferences,
    days,
    ratingAverage: 4.6,
    estimatedBudgetLabel: {
      ko:
        preferences.budgetLevel === "value"
          ? "1인 4만~7만 원"
          : preferences.budgetLevel === "premium"
            ? "1인 12만 원 이상"
            : "1인 7만~12만 원",
      en:
        preferences.budgetLevel === "value"
          ? "KRW 40k-70k per person"
          : preferences.budgetLevel === "premium"
            ? "KRW 120k+ per person"
            : "KRW 70k-120k per person",
    },
  };
};

export const buildIndoorFallback = (itinerary: Itinerary, candidatePlaces = seedPlaces): Itinerary => {
  const indoorPlaces = candidatePlaces.filter((place) => place.indoor || place.accessibility);
  const preferences = {
    ...itinerary.preferences,
    indoorFallback: true,
  };

  return {
    ...buildFallbackItinerary(preferences, indoorPlaces),
    summary: {
      ko: "비나 혼잡을 고려해 실내 친화적으로 다시 정리한 대체 루트입니다.",
      en: "An indoor-friendly reroute prepared for rain, queues, or schedule drift.",
    },
  };
};

export const validateStructuredItinerary = (payload: unknown) => itinerarySchema.safeParse(payload);
