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
    const { itinerary, profileId, shareStatus } = await request.json();

    const ownedProfileId = await requireOwnedProfile({
      admin,
      profileId,
      authUserId: authUser.id,
    });

    const result = await upsertItineraryGraph({
      admin,
      itinerary,
      profileId: ownedProfileId,
      shareStatus: shareStatus ?? itinerary?.shareStatus ?? "private",
    });

    return json({
      itinerary: {
        ...result.itinerary,
        syncStatus: "synced",
      },
      shared: result.shared,
      syncStatus: "synced",
    });
  } catch (error) {
    return json(
      {
        message: error instanceof Error ? error.message : "Unable to publish the itinerary.",
      },
      400
    );
  }
});
