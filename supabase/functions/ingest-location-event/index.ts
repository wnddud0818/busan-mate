import { corsHeaders, json } from "../_shared/cors.ts";
import { createAdminClient, requireAuthUser, requireOwnedProfile } from "../_shared/db.ts";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authUser = await requireAuthUser(request);
    const admin = createAdminClient();
    const { event, session, profileId } = await request.json();

    const ownedProfileId = await requireOwnedProfile({
      admin,
      profileId,
      authUserId: authUser.id,
    });

    if (!session?.remoteId) {
      throw new Error("A remote trip session is required before ingesting location events.");
    }

    const { data: remoteSession, error: sessionError } = await admin
      .from("trip_sessions")
      .update({
        profile_id: ownedProfileId,
        status: session.status,
        current_day: session.currentDay,
        current_stop_order: session.currentStopOrder,
        location_consent: session.locationConsent,
        last_alert_at: session.lastAlertAt ?? null,
      })
      .eq("id", session.remoteId)
      .select("id")
      .single();

    if (sessionError || !remoteSession?.id) {
      throw sessionError ?? new Error("Unable to update the live trip session.");
    }

    const { data: remoteEvent, error: eventError } = await admin
      .from("location_events")
      .upsert(
        {
          id: event.remoteId,
          client_id: event.id,
          trip_session_id: remoteSession.id,
          geohash: event.geohash,
          consented: event.consented,
          captured_at: event.capturedAt,
        },
        {
          onConflict: "client_id",
        }
      )
      .select("id")
      .single();

    if (eventError || !remoteEvent?.id) {
      throw eventError ?? new Error("Unable to store the location event.");
    }

    return json({
      event: {
        id: remoteEvent.id,
      },
      session: {
        id: remoteSession.id,
      },
      syncStatus: "synced",
    });
  } catch (error) {
    return json(
      {
        message: error instanceof Error ? error.message : "Unable to ingest the location event.",
      },
      400
    );
  }
});
