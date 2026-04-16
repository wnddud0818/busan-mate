import { hasSupabaseConfig } from "../config/env";
import { RateItineraryResult, Itinerary, UserProfile } from "../types/domain";
import { canInvokeEdgeFunction, supabase } from "../lib/supabase";
import { logApiError, logApiRequest, logApiResponse, logDebugInfo } from "./debug-service";
import { hasRemoteProfile, toLocalSharedSnapshot } from "./remote-sync";

const applyLocalRating = (itinerary: Itinerary, rating: number, syncStatus: "synced" | "pending") => {
  const safeRating = Math.max(1, Math.min(5, rating));
  return {
    ...itinerary,
    syncStatus,
    ratingAverage: Number(((itinerary.ratingAverage + safeRating) / 2).toFixed(1)),
  };
};

export const rateItinerary = async ({
  itinerary,
  rating,
  userProfile,
}: {
  itinerary: Itinerary;
  rating: number;
  userProfile?: UserProfile;
}): Promise<RateItineraryResult> => {
  const localSyncStatus = hasSupabaseConfig ? "pending" : "synced";
  const remoteProfileReady = hasRemoteProfile(userProfile);
  const remoteRatingAvailable =
    remoteProfileReady && supabase ? await canInvokeEdgeFunction("rate-itinerary") : false;

  if (!remoteProfileReady || !remoteRatingAvailable) {
    logDebugInfo({
      label: "rate-itinerary",
      summary: "Applying itinerary rating locally because remote rating is unavailable.",
      payload: {
        itineraryId: itinerary.id,
        rating,
        hasRemoteProfile: remoteProfileReady,
        hasRemoteFunction: remoteRatingAvailable,
      },
    });
    const nextItinerary = applyLocalRating(itinerary, rating, localSyncStatus);
    return {
      itinerary: nextItinerary,
      shared: itinerary.shareStatus === "published" ? toLocalSharedSnapshot(nextItinerary, localSyncStatus) : undefined,
      syncStatus: localSyncStatus,
    };
  }

  const traceId = logApiRequest({
    label: "rate-itinerary",
    summary: "Sending itinerary rating to Supabase.",
    payload: {
      itineraryId: itinerary.id,
      rating,
      profileId: userProfile!.profileId,
    },
  });
  const { data, error } = await supabase!.functions.invoke("rate-itinerary", {
    body: {
      itinerary,
      rating,
      profileId: userProfile!.profileId,
    },
  });

  if (error || !data?.itinerary) {
    logApiError({
      label: "rate-itinerary",
      traceId,
      summary: "Supabase rating failed. Keeping a pending local rating.",
      error: error ?? new Error("Missing itinerary in rating response."),
      payload: {
        itineraryId: itinerary.id,
        rating,
      },
    });
    const nextItinerary = applyLocalRating(itinerary, rating, "pending");
    return {
      itinerary: nextItinerary,
      shared: itinerary.shareStatus === "published" ? toLocalSharedSnapshot(nextItinerary, "pending") : undefined,
      syncStatus: "pending",
    };
  }
  logApiResponse({
    label: "rate-itinerary",
    traceId,
    summary: "Supabase rating succeeded.",
    payload: data,
  });

  const nextItinerary: Itinerary = {
    ...itinerary,
    remoteId: data.itinerary.remoteId ?? data.itinerary.id ?? itinerary.remoteId,
    shareStatus: data.itinerary.shareStatus ?? itinerary.shareStatus,
    ratingAverage: data.itinerary.ratingAverage ?? itinerary.ratingAverage,
    syncStatus: "synced",
  };

  return {
    itinerary: nextItinerary,
    shared:
      nextItinerary.shareStatus === "published"
        ? {
            ...toLocalSharedSnapshot(nextItinerary, "synced"),
            ...data.shared,
            remoteId: data.shared?.remoteId ?? data.shared?.id,
            syncStatus: "synced",
          }
        : undefined,
    syncStatus: "synced",
  };
};
