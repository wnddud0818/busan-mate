import { corsHeaders, json } from "../_shared/cors.ts";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const { itinerary } = await request.json();
  const heroStop = itinerary?.days?.[0]?.stops?.[0];

  return json({
    id: crypto.randomUUID(),
    itineraryId: itinerary.id,
    title: itinerary.title,
    summary: itinerary.summary,
    heroPlaceName: heroStop?.place?.name ?? itinerary.title,
    tags: itinerary.preferences?.interests?.slice(0, 3) ?? [],
    ratingAverage: itinerary.ratingAverage ?? 4.7,
    currentTravelers: 8,
    score: 84,
  });
});
