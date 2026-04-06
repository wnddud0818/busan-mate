import { corsHeaders, json } from "../_shared/cors.ts";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const { sharedItineraries = [] } = await request.json();

  return json(
    sharedItineraries.map((route: Record<string, unknown>, index: number) => ({
      id: `ranking-${route.id ?? index}`,
      itineraryId: route.itineraryId,
      title: route.title,
      summary: route.summary,
      highlight: {
        ko: `현재 이 루트를 따라가는 이용자 ${(route.currentTravelers as number | undefined) ?? 0}명`,
        en: `${(route.currentTravelers as number | undefined) ?? 0} active travelers are following this route now`,
      },
      tags: route.tags ?? [],
      currentTravelers: route.currentTravelers ?? 0,
      score: route.score ?? 0,
    }))
  );
});
