import { hasSupabaseConfig } from "../config/env";
import { materializeRanking } from "../features/ranking/scoring";
import { supabase } from "../lib/supabase";
import { LocationEvent, RankingSnapshot, SharedItinerary } from "../types/domain";
import { logApiError, logApiRequest, logApiResponse, logDebugInfo } from "./debug-service";

export const loadRankings = async ({
  sharedItineraries,
  locationEvents,
}: {
  sharedItineraries: SharedItinerary[];
  locationEvents: LocationEvent[];
}): Promise<RankingSnapshot[]> => {
  if (hasSupabaseConfig && supabase) {
    const traceId = logApiRequest({
      label: "materialize-ranking",
      summary: "Requesting materialized rankings from Supabase.",
      payload: {
        sharedCount: sharedItineraries.length,
        locationEventCount: locationEvents.length,
      },
    });
    const { data, error } = await supabase.functions.invoke("materialize-ranking");

    if (!error && Array.isArray(data)) {
      logApiResponse({
        label: "materialize-ranking",
        traceId,
        summary: `Loaded ${data.length} ranking rows from Supabase.`,
        payload: data,
      });
      return data;
    }

    logApiError({
      label: "materialize-ranking",
      traceId,
      summary: "Supabase ranking materialization failed. Falling back to local ranking logic.",
      error: error ?? new Error("Ranking response was not an array."),
    });
  }

  logDebugInfo({
    label: "materialize-ranking",
    summary: "Using local ranking materialization.",
    payload: {
      sharedCount: sharedItineraries.length,
      locationEventCount: locationEvents.length,
    },
  });

  return materializeRanking(sharedItineraries, locationEvents);
};
