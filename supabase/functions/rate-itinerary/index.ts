import { corsHeaders, json } from "../_shared/cors.ts";
import { createAdminClient, requireAuthUser, requireOwnedProfile } from "../_shared/db.ts";
import { upsertItineraryGraph } from "../_shared/itinerary-sync.ts";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authUser = await requireAuthUser(request);
    const admin = createAdminClient();
    const { itinerary, profileId, rating } = await request.json();

    const ownedProfileId = await requireOwnedProfile({
      admin,
      profileId,
      authUserId: authUser.id,
    });

    const synced = await upsertItineraryGraph({
      admin,
      itinerary,
      profileId: ownedProfileId,
      shareStatus: itinerary?.shareStatus ?? "private",
    });

    const ratingValue = Math.max(1, Math.min(5, Number(rating) || 0));
    const ratingClientId = `${itinerary.id}:${ownedProfileId}`;

    const { error: ratingError } = await admin.from("ratings").upsert(
      {
        client_id: ratingClientId,
        itinerary_id: synced.itinerary.remoteId,
        profile_id: ownedProfileId,
        rating: ratingValue,
      },
      {
        onConflict: "client_id",
      }
    );

    if (ratingError) {
      throw ratingError;
    }

    const { data: ratings, error: ratingsError } = await admin
      .from("ratings")
      .select("rating")
      .eq("itinerary_id", synced.itinerary.remoteId);

    if (ratingsError) {
      throw ratingsError;
    }

    const average =
      ratings.length > 0
        ? Number(
            (
              ratings.reduce((total: number, item: { rating: number }) => total + Number(item.rating ?? 0), 0) /
              ratings.length
            ).toFixed(1)
          )
        : itinerary.ratingAverage;

    const rerendered = await upsertItineraryGraph({
      admin,
      itinerary: {
        ...itinerary,
        remoteId: synced.itinerary.remoteId,
        ratingAverage: average,
      },
      profileId: ownedProfileId,
      shareStatus: itinerary?.shareStatus ?? "private",
    });

    return json({
      itinerary: {
        ...rerendered.itinerary,
        ratingAverage: average,
        syncStatus: "synced",
      },
      shared: rerendered.shared,
      syncStatus: "synced",
    });
  } catch (error) {
    return json(
      {
        message: error instanceof Error ? error.message : "Unable to rate the itinerary.",
      },
      400
    );
  }
});
