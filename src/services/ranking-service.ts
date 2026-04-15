import { hasSupabaseConfig } from "../config/env";
import { materializeRanking } from "../features/ranking/scoring";
import { supabase } from "../lib/supabase";
import { LocationEvent, RankingSnapshot, SharedItinerary } from "../types/domain";

export const loadRankings = async ({
  sharedItineraries,
  locationEvents,
}: {
  sharedItineraries: SharedItinerary[];
  locationEvents: LocationEvent[];
}): Promise<RankingSnapshot[]> => {
  if (hasSupabaseConfig && supabase) {
    const { data, error } = await supabase.functions.invoke("materialize-ranking");

    if (!error && Array.isArray(data)) {
      return data;
    }
  }

  return materializeRanking(sharedItineraries, locationEvents);
};
