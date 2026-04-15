import { corsHeaders, json } from "../_shared/cors.ts";
import { createAdminClient } from "../_shared/db.ts";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const admin = createAdminClient();
    const { data: routes, error } = await admin
      .from("shared_itineraries")
      .select(
        "id, itinerary_id, hero_place_name, tags, current_travelers, score, itineraries!inner(title, summary, rating_average)"
      );

    if (error) {
      throw error;
    }

    const rankings = await Promise.all(
      (routes ?? []).map(async (route: Record<string, unknown>) => {
        const itineraryId = String(route.itinerary_id ?? "");
        const { data: sessions } = await admin
          .from("trip_sessions")
          .select("id")
          .eq("itinerary_id", itineraryId);

        const sessionIds = (sessions ?? []).map((session: { id: string }) => session.id);
        const locationCount =
          sessionIds.length > 0
            ? (
                await admin
                  .from("location_events")
                  .select("id", {
                    count: "exact",
                    head: true,
                  })
                  .in("trip_session_id", sessionIds)
              ).count ?? 0
            : 0;

        const itinerary = route.itineraries as { title: unknown; summary: unknown } | undefined;
        const currentTravelers = Number(route.current_travelers ?? 0) + locationCount;

        return {
          id: `ranking-${route.id}`,
          itineraryId: itineraryId,
          title: itinerary?.title,
          summary: itinerary?.summary,
          highlight: {
            ko: `현재 이 루트를 따라가는 이용자 ${currentTravelers}명`,
            en: `${currentTravelers} active travelers are following this route now`,
          },
          tags: Array.isArray(route.tags) ? route.tags : [],
          currentTravelers,
          score: Number(route.score ?? 0),
        };
      })
    );

    return json(rankings);
  } catch (error) {
    return json(
      {
        message: error instanceof Error ? error.message : "Unable to load rankings.",
      },
      400
    );
  }
});
