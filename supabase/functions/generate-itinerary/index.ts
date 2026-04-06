import { corsHeaders, json } from "../_shared/cors.ts";

type Place = {
  id: string;
  name: { ko: string; en: string };
  description: { ko: string; en: string };
  district: string;
  coordinates: { latitude: number; longitude: number };
};

type Preferences = {
  tripDays: number;
  locale: "ko" | "en";
  startDistrict: string;
  budgetLevel: "value" | "balanced" | "premium";
};

const makeBudgetLabel = (budgetLevel: Preferences["budgetLevel"]) =>
  budgetLevel === "value"
    ? { ko: "1인 4만~7만 원", en: "KRW 40k-70k per person" }
    : budgetLevel === "premium"
      ? { ko: "1인 12만 원 이상", en: "KRW 120k+ per person" }
      : { ko: "1인 7만~12만 원", en: "KRW 70k-120k per person" };

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const { preferences, places = [] } = (await request.json()) as {
    preferences: Preferences;
    places: Place[];
  };

  const selected = places.slice(0, Math.max(4, preferences.tripDays * 3));
  const days = Array.from({ length: preferences.tripDays }, (_, index) => {
    const dayStops = selected
      .filter((_, stopIndex) => stopIndex % preferences.tripDays === index)
      .slice(0, 4);

    const dayDate = `2026-04-${String(10 + index).padStart(2, "0")}`;

    return {
      dayNumber: index + 1,
      theme: {
        ko: "부산 큐레이션 루트",
        en: "Curated Busan route",
      },
      stops: dayStops.map((place, order) => ({
        id: `${place.id}-${order}`,
        order: order + 1,
        date: dayDate,
        startTime: `${dayDate}T${String(9 + order * 2).padStart(2, "0")}:00:00+09:00`,
        endTime: `${dayDate}T${String(10 + order * 2).padStart(2, "0")}:00:00+09:00`,
        highlight: {
          ko: `${place.district} 대표 포인트`,
          en: `Top stop in ${place.district}`,
        },
        note: {
          ko: "실시간 상황에 따라 체류 시간을 조금 조정해도 좋습니다.",
          en: "You can trim the stay slightly if live conditions change.",
        },
        place,
      })),
    };
  });

  return json({
    itinerary: {
      id: crypto.randomUUID(),
      routeSlug: `busan-${preferences.startDistrict.toLowerCase().replace(/\s+/g, "-")}`,
      title: {
        ko: `${preferences.startDistrict} 출발 부산 루트`,
        en: `Busan route from ${preferences.startDistrict}`,
      },
      summary: {
        ko: "실시간 연동이 가능한 구조화 일정입니다.",
        en: "A structured itinerary ready for live guidance integrations.",
      },
      createdAt: new Date().toISOString(),
      locale: preferences.locale,
      source: "ai",
      shareStatus: "private",
      preferences,
      days,
      ratingAverage: 4.7,
      estimatedBudgetLabel: makeBudgetLabel(preferences.budgetLevel),
    },
  });
});
