import { hasSupabaseConfig } from "../config/env";
import { supabase } from "../lib/supabase";
import {
  Itinerary,
  LocationEvent,
  LocationIngestResult,
  StartSessionResult,
  SyncStatus,
  TripSession,
  UserProfile,
} from "../types/domain";
import { logApiError, logApiRequest, logApiResponse, logDebugInfo } from "./debug-service";
import { hasRemoteProfile, syncItineraryRecord } from "./remote-sync";

const localSyncStatus = (): SyncStatus => (hasSupabaseConfig ? "pending" : "synced");

const withSessionSync = (
  session: TripSession,
  {
    remoteId,
    syncStatus,
  }: {
    remoteId?: string;
    syncStatus: SyncStatus;
  }
): TripSession => ({
  ...session,
  remoteId: remoteId ?? session.remoteId,
  syncStatus,
});

const withEventSync = (
  event: LocationEvent,
  {
    remoteId,
    syncStatus,
  }: {
    remoteId?: string;
    syncStatus: SyncStatus;
  }
): LocationEvent => ({
  ...event,
  remoteId: remoteId ?? event.remoteId,
  syncStatus,
});

const upsertRemoteSession = async ({
  session,
  itineraryRemoteId,
  userProfile,
}: {
  session: TripSession;
  itineraryRemoteId: string;
  userProfile: UserProfile;
}) => {
  const traceId = logApiRequest({
    label: "trip_sessions.upsert",
    summary: "Upserting live trip session in Supabase.",
    payload: {
      session,
      itineraryRemoteId,
      profileId: userProfile.profileId,
    },
  });
  const { data, error } = await supabase!
    .from("trip_sessions")
    .upsert(
      {
        id: session.remoteId,
        client_id: session.id,
        itinerary_id: itineraryRemoteId,
        profile_id: userProfile.profileId,
        status: session.status,
        current_day: session.currentDay,
        current_stop_order: session.currentStopOrder,
        location_consent: session.locationConsent,
        started_at: session.startedAt,
        last_alert_at: session.lastAlertAt ?? null,
      },
      {
        onConflict: "client_id",
      }
    )
    .select(
      "id, status, current_day, current_stop_order, location_consent, started_at, last_alert_at"
    )
    .single();

  if (error || !data?.id) {
    logApiError({
      label: "trip_sessions.upsert",
      traceId,
      summary: "Trip session upsert failed.",
      error: error ?? new Error("Missing session id after upsert."),
      payload: {
        sessionId: session.id,
        itineraryRemoteId,
      },
    });
    throw error ?? new Error("Unable to sync the live trip session.");
  }

  logApiResponse({
    label: "trip_sessions.upsert",
    traceId,
    summary: "Trip session synced successfully.",
    payload: data,
  });

  return data;
};

export const syncLiveSession = async ({
  itinerary,
  session,
  userProfile,
}: {
  itinerary: Itinerary;
  session: TripSession;
  userProfile?: UserProfile;
}): Promise<StartSessionResult> => {
  const itineraryResult = await syncItineraryRecord({
    itinerary,
    userProfile,
    shareStatus: itinerary.shareStatus,
  });

  if (!hasRemoteProfile(userProfile) || !itineraryResult.itinerary.remoteId) {
    logDebugInfo({
      label: "sync-live-session",
      summary: "Keeping the live session local because remote sync is unavailable.",
      payload: {
        itineraryId: itinerary.id,
        sessionId: session.id,
      },
    });
    return {
      itinerary: {
        ...itineraryResult.itinerary,
        syncStatus: itineraryResult.syncStatus,
      },
      session: withSessionSync(session, {
        syncStatus: localSyncStatus(),
      }),
      syncStatus: localSyncStatus(),
    };
  }

  try {
    const data = await upsertRemoteSession({
      session,
      itineraryRemoteId: itineraryResult.itinerary.remoteId,
      userProfile: userProfile!,
    });
    logApiResponse({
      label: "sync-live-session",
      summary: "Live session synced to Supabase.",
      payload: {
        itineraryId: itineraryResult.itinerary.remoteId,
        sessionId: data.id,
      },
    });

    return {
      itinerary: itineraryResult.itinerary,
      session: withSessionSync(session, {
        remoteId: data.id,
        syncStatus: "synced",
      }),
      syncStatus: "synced",
    };
  } catch (error) {
    logApiError({
      label: "sync-live-session",
      summary: "Live session sync failed. Keeping pending local state.",
      error,
      payload: {
        itineraryId: itinerary.id,
        sessionId: session.id,
      },
    });
    return {
      itinerary: {
        ...itineraryResult.itinerary,
        syncStatus: "pending",
      },
      session: withSessionSync(session, {
        syncStatus: "pending",
      }),
      syncStatus: "pending",
    };
  }
};

export const ingestLocationEvent = async ({
  itinerary,
  session,
  event,
  userProfile,
}: {
  itinerary: Itinerary;
  session: TripSession;
  event: LocationEvent;
  userProfile?: UserProfile;
}): Promise<LocationIngestResult> => {
  const sessionResult = await syncLiveSession({
    itinerary,
    session,
    userProfile,
  });

  if (!hasRemoteProfile(userProfile) || !sessionResult.session.remoteId) {
    logDebugInfo({
      label: "ingest-location-event",
      summary: "Keeping location event local because remote sync is unavailable.",
      payload: {
        eventId: event.id,
        sessionId: session.id,
      },
    });
    return {
      event: withEventSync(event, {
        syncStatus: localSyncStatus(),
      }),
      session: sessionResult.session,
      syncStatus: localSyncStatus(),
    };
  }

  const traceId = logApiRequest({
    label: "ingest-location-event",
    summary: "Sending location event to Supabase.",
    payload: {
      event,
      session: sessionResult.session,
      profileId: userProfile!.profileId,
    },
  });
  const { data, error } = await supabase!.functions.invoke("ingest-location-event", {
    body: {
      event,
      session: sessionResult.session,
      profileId: userProfile!.profileId,
    },
  });

  if (error || !data?.event?.id) {
    logApiError({
      label: "ingest-location-event",
      traceId,
      summary: "Location ingest failed. Keeping a pending local event.",
      error: error ?? new Error("Missing event id in ingest response."),
      payload: {
        eventId: event.id,
        sessionId: session.id,
      },
    });
    return {
      event: withEventSync(event, {
        syncStatus: "pending",
      }),
      session: withSessionSync(sessionResult.session, {
        syncStatus: "pending",
      }),
      syncStatus: "pending",
    };
  }

  logApiResponse({
    label: "ingest-location-event",
    traceId,
    summary: "Location event synced successfully.",
    payload: data,
  });

  return {
    event: withEventSync(event, {
      remoteId: data.event.id,
      syncStatus: "synced",
    }),
    session: withSessionSync(sessionResult.session, {
      remoteId: data.session?.id ?? sessionResult.session.remoteId,
      syncStatus: "synced",
    }),
    syncStatus: "synced",
  };
};
