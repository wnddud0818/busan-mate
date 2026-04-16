import { hasSupabaseConfig } from "../config/env";
import { buildSharedSnapshot } from "../features/ranking/scoring";
import { canInvokeEdgeFunction, supabase } from "../lib/supabase";
import { Itinerary, SharedItinerary, SyncStatus, UserProfile } from "../types/domain";
import { logApiError, logApiRequest, logApiResponse, logDebugInfo } from "./debug-service";

type SyncItineraryRecordResult = {
  itinerary: Itinerary;
  shared?: SharedItinerary;
  syncStatus: SyncStatus;
};

export const hasRemoteProfile = (userProfile?: UserProfile) =>
  Boolean(hasSupabaseConfig && supabase && userProfile?.profileId);

export const toLocalSharedSnapshot = (
  itinerary: Itinerary,
  syncStatus: SyncStatus = itinerary.syncStatus
): SharedItinerary => ({
  ...buildSharedSnapshot({
    ...itinerary,
    shareStatus: "published",
    syncStatus,
  }),
  syncStatus,
});

const withItinerarySync = (
  itinerary: Itinerary,
  {
    remoteId,
    shareStatus,
    syncStatus,
  }: {
    remoteId?: string;
    shareStatus?: Itinerary["shareStatus"];
    syncStatus: SyncStatus;
  }
): Itinerary => ({
  ...itinerary,
  remoteId: remoteId ?? itinerary.remoteId,
  shareStatus: shareStatus ?? itinerary.shareStatus,
  syncStatus,
});

const withSharedSync = (
  itinerary: Itinerary,
  shared: Partial<SharedItinerary> | undefined,
  syncStatus: SyncStatus
): SharedItinerary | undefined => {
  if (!shared && itinerary.shareStatus !== "published") {
    return undefined;
  }

  const base = toLocalSharedSnapshot(itinerary, syncStatus);
  return {
    ...base,
    ...shared,
    remoteId: shared?.remoteId ?? shared?.id ?? base.remoteId,
    syncStatus,
  };
};

export const syncItineraryRecord = async ({
  itinerary,
  userProfile,
  shareStatus = itinerary.shareStatus,
}: {
  itinerary: Itinerary;
  userProfile?: UserProfile;
  shareStatus?: Itinerary["shareStatus"];
}): Promise<SyncItineraryRecordResult> => {
  const nextItinerary = withItinerarySync(itinerary, {
    shareStatus,
    syncStatus: hasRemoteProfile(userProfile) ? "pending" : "synced",
  });

  if (!hasRemoteProfile(userProfile)) {
    logDebugInfo({
      label: "publish-itinerary",
      summary: "Skipping remote publish because there is no remote profile.",
      payload: {
        itineraryId: itinerary.id,
        shareStatus,
      },
    });
    return {
      itinerary: nextItinerary,
      shared: shareStatus === "published" ? toLocalSharedSnapshot(nextItinerary, nextItinerary.syncStatus) : undefined,
      syncStatus: nextItinerary.syncStatus,
    };
  }

  const remotePublishAvailable = await canInvokeEdgeFunction("publish-itinerary");
  if (!remotePublishAvailable) {
    logDebugInfo({
      label: "publish-itinerary",
      summary: "Skipping remote publish because the Supabase Edge Function is unavailable.",
      payload: {
        itineraryId: itinerary.id,
        shareStatus,
      },
    });
    return {
      itinerary: nextItinerary,
      shared: shareStatus === "published" ? toLocalSharedSnapshot(nextItinerary, nextItinerary.syncStatus) : undefined,
      syncStatus: nextItinerary.syncStatus,
    };
  }

  const traceId = logApiRequest({
    label: "publish-itinerary",
    summary: "Syncing itinerary to Supabase.",
    payload: {
      itinerary,
      shareStatus,
      profileId: userProfile!.profileId,
    },
  });
  const { data, error } = await supabase!.functions.invoke("publish-itinerary", {
    body: {
      itinerary,
      shareStatus,
      profileId: userProfile!.profileId,
    },
  });

  if (error || !data?.itinerary) {
    logApiError({
      label: "publish-itinerary",
      traceId,
      summary: "Supabase publish failed. Keeping a pending local snapshot.",
      error: error ?? new Error("Missing itinerary in publish response."),
      payload: {
        itineraryId: itinerary.id,
        shareStatus,
      },
    });
    return {
      itinerary: withItinerarySync(itinerary, {
        shareStatus,
        syncStatus: "pending",
      }),
      shared: shareStatus === "published" ? toLocalSharedSnapshot(itinerary, "pending") : undefined,
      syncStatus: "pending",
    };
  }

  const syncedItinerary = withItinerarySync(itinerary, {
    remoteId: data.itinerary.remoteId ?? data.itinerary.id,
    shareStatus: data.itinerary.shareStatus ?? shareStatus,
    syncStatus: "synced",
  });
  logApiResponse({
    label: "publish-itinerary",
    traceId,
    summary: "Supabase publish succeeded.",
    payload: {
      itinerary: data.itinerary,
      shared: data.shared,
    },
  });

  return {
    itinerary: syncedItinerary,
    shared: withSharedSync(syncedItinerary, data.shared, "synced"),
    syncStatus: "synced",
  };
};
