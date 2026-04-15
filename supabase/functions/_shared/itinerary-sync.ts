import { createAdminClient } from "./db.ts";

type LocalizedText = {
  ko: string;
  en: string;
};

type Place = {
  name: LocalizedText;
};

type ItineraryStop = {
  place: Place;
};

type ItineraryDay = {
  dayNumber: number;
  theme: LocalizedText;
  stops: ItineraryStop[];
};

type ItineraryPayload = {
  id: string;
  remoteId?: string;
  locale: "ko" | "en";
  title: LocalizedText;
  summary: LocalizedText;
  preferences: Record<string, unknown> & {
    interests: string[];
  };
  source: "ai" | "fallback";
  shareStatus: "private" | "published";
  ratingAverage: number;
  estimatedBudgetLabel: LocalizedText;
  planningMeta?: Record<string, unknown>;
  createdAt: string;
  days: ItineraryDay[];
};

const computeRankingScore = ({
  ratingAverage,
  currentTravelers,
  seedBoost,
}: {
  ratingAverage: number;
  currentTravelers: number;
  seedBoost: number;
}) => Number((ratingAverage * 18 + currentTravelers * 1.7 + seedBoost).toFixed(1));

export const upsertItineraryGraph = async ({
  admin,
  itinerary,
  profileId,
  shareStatus,
}: {
  admin: ReturnType<typeof createAdminClient>;
  itinerary: ItineraryPayload;
  profileId: string;
  shareStatus: "private" | "published";
}) => {
  const { data: itineraryRow, error: itineraryError } = await admin
    .from("itineraries")
    .upsert(
      {
        id: itinerary.remoteId,
        client_id: itinerary.id,
        profile_id: profileId,
        locale: itinerary.locale,
        title: itinerary.title,
        summary: itinerary.summary,
        preferences: itinerary.preferences,
        source: itinerary.source,
        share_status: shareStatus,
        rating_average: itinerary.ratingAverage,
        estimated_budget_label: itinerary.estimatedBudgetLabel,
        planning_meta: itinerary.planningMeta ?? null,
        created_at: itinerary.createdAt,
      },
      {
        onConflict: "client_id",
      }
    )
    .select("id, share_status, rating_average")
    .single();

  if (itineraryError || !itineraryRow?.id) {
    throw itineraryError ?? new Error("Unable to store the itinerary.");
  }

  await admin.from("itinerary_days").delete().eq("itinerary_id", itineraryRow.id);

  for (const day of itinerary.days) {
    const { data: dayRow, error: dayError } = await admin
      .from("itinerary_days")
      .insert({
        itinerary_id: itineraryRow.id,
        day_number: day.dayNumber,
        theme: day.theme,
      })
      .select("id")
      .single();

    if (dayError || !dayRow?.id) {
      throw dayError ?? new Error("Unable to store an itinerary day.");
    }

    if (day.stops.length === 0) {
      continue;
    }

    const stopRows = day.stops.map((stop, index) => ({
      itinerary_day_id: dayRow.id,
      stop_order: index + 1,
      place_id: stop.place.name.en,
      payload: stop,
    }));

    const { error: stopError } = await admin.from("itinerary_stops").insert(stopRows);
    if (stopError) {
      throw stopError;
    }
  }

  const response = {
    id: itinerary.id,
    remoteId: itineraryRow.id,
    shareStatus,
    ratingAverage: Number(itineraryRow.rating_average ?? itinerary.ratingAverage),
  };

  if (shareStatus !== "published") {
    return {
      itinerary: response,
      shared: undefined,
    };
  }

  const heroPlaceName = itinerary.days[0]?.stops[0]?.place.name ?? itinerary.title;
  const { data: existingShared } = await admin
    .from("shared_itineraries")
    .select("id, current_travelers")
    .eq("itinerary_id", itineraryRow.id)
    .maybeSingle();

  const currentTravelers = existingShared?.current_travelers ?? 5;
  const { data: sharedRow, error: sharedError } = await admin
    .from("shared_itineraries")
    .upsert(
      {
        id: existingShared?.id,
        itinerary_id: itineraryRow.id,
        hero_place_name: heroPlaceName,
        tags: itinerary.preferences.interests.slice(0, 3),
        current_travelers: currentTravelers,
        score: computeRankingScore({
          ratingAverage: response.ratingAverage,
          currentTravelers,
          seedBoost: 42,
        }),
      },
      {
        onConflict: "itinerary_id",
      }
    )
    .select("id, current_travelers, score")
    .single();

  if (sharedError || !sharedRow?.id) {
    throw sharedError ?? new Error("Unable to store the shared itinerary.");
  }

  return {
    itinerary: response,
    shared: {
      id: `shared-${itinerary.id}`,
      remoteId: sharedRow.id,
      itineraryId: itinerary.id,
      title: itinerary.title,
      summary: itinerary.summary,
      heroPlaceName,
      tags: itinerary.preferences.interests.slice(0, 3),
      ratingAverage: response.ratingAverage,
      currentTravelers: sharedRow.current_travelers ?? currentTravelers,
      score: Number(sharedRow.score ?? 0),
      syncStatus: "synced",
    },
  };
};
