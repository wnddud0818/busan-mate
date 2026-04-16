import { seedRanking, seedSharedRoutes } from "../../data/seed";
import {
  Itinerary,
  LocationEvent,
  RankingSnapshot,
  SharedItinerary,
} from "../../types/domain";

const liveTravelerCount = (itineraryId: string, locationEvents: LocationEvent[]) => {
  const sessionPrefix = `trip-${itineraryId.slice(0, 6)}-`;
  const uniqueSessions = new Set(
    locationEvents
      .filter((event) => event.syncStatus === "synced" && event.tripSessionId.startsWith(sessionPrefix))
      .map((event) => event.tripSessionId)
  );
  return uniqueSessions.size;
};

export const computeRankingScore = ({
  ratingAverage,
  currentTravelers,
  seedBoost,
}: {
  ratingAverage: number;
  currentTravelers: number;
  seedBoost: number;
}) => Number((ratingAverage * 18 + currentTravelers * 1.7 + seedBoost).toFixed(1));

export const materializeRanking = (
  publishedItineraries: SharedItinerary[],
  locationEvents: LocationEvent[]
): RankingSnapshot[] => {
  const eligibleRoutes = publishedItineraries.filter((route) => route.syncStatus === "synced");

  if (eligibleRoutes.length === 0) {
    return seedRanking;
  }

  return eligibleRoutes
    .map((route) => {
      const travelers = route.currentTravelers + liveTravelerCount(route.itineraryId, locationEvents);
      return {
        id: `ranking-${route.id}`,
        itineraryId: route.itineraryId,
        title: route.title,
        summary: route.summary,
        highlight: {
          ko: `현재 이 루트를 따라가는 이용자 ${travelers}명`,
          en: `${travelers} active travelers are following this route now`,
        },
        tags: route.tags,
        currentTravelers: travelers,
        score: computeRankingScore({
          ratingAverage: route.ratingAverage,
          currentTravelers: travelers,
          seedBoost: route.score * 0.3,
        }),
      };
    })
    .sort((left, right) => right.score - left.score);
};

export const buildSharedSnapshot = (itinerary: Itinerary): SharedItinerary => {
  const firstStop = itinerary.days[0]?.stops[0];

  return {
    id: `shared-${itinerary.id}`,
    syncStatus: itinerary.syncStatus,
    itineraryId: itinerary.id,
    title: itinerary.title,
    summary: itinerary.summary,
    heroPlaceName: firstStop?.place.name ?? itinerary.title,
    tags: itinerary.preferences.interests.slice(0, 3),
    ratingAverage: itinerary.ratingAverage,
    currentTravelers: 5,
    score: computeRankingScore({
      ratingAverage: itinerary.ratingAverage,
      currentTravelers: 5,
      seedBoost: 42,
    }),
  };
};

export const seedSharedRankings = () => materializeRanking(seedSharedRoutes, []);
