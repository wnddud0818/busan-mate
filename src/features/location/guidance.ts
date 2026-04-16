import { differenceInMinutes, parseISO } from "date-fns";
import { getDistance } from "geolib";
import ngeohash from "ngeohash";

import { Coordinates, Itinerary, LocationEvent, TripSession } from "../../types/domain";

export const shouldTriggerDepartureAlert = ({
  distanceToCurrentStopMeters,
  minutesUntilNextStop,
  lastAlertAt,
  nowIso,
}: {
  distanceToCurrentStopMeters: number;
  minutesUntilNextStop: number;
  lastAlertAt?: string;
  nowIso: string;
}) => {
  const minutesSinceLastAlert = lastAlertAt
    ? differenceInMinutes(parseISO(nowIso), parseISO(lastAlertAt))
    : Number.POSITIVE_INFINITY;

  return minutesUntilNextStop <= 20 && distanceToCurrentStopMeters >= 250 && minutesSinceLastAlert >= 15;
};

export const detectDeviation = ({
  distanceToNextStopMeters,
  minutesBehind,
}: {
  distanceToNextStopMeters: number;
  minutesBehind: number;
}) => distanceToNextStopMeters >= 1200 || minutesBehind >= 25;

export const createLocationEvent = ({
  session,
  coordinates,
  consented,
}: {
  session: TripSession;
  coordinates: Coordinates;
  consented: boolean;
}): LocationEvent => ({
  id: `${session.id}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
  syncStatus: "pending",
  tripSessionId: session.id,
  capturedAt: new Date().toISOString(),
  geohash: consented ? ngeohash.encode(coordinates.latitude, coordinates.longitude, 6) : null,
  consented,
});

export const evaluateTrackingUpdate = ({
  itinerary,
  session,
  coordinates,
  nowIso,
}: {
  itinerary: Itinerary;
  session: TripSession;
  coordinates: Coordinates;
  nowIso: string;
}) => {
  const day = itinerary.days[session.currentDay - 1];
  const currentStop = day?.stops[session.currentStopOrder - 1];
  const nextStop =
    day?.stops[session.currentStopOrder] ??
    itinerary.days[session.currentDay]?.stops[0];

  if (!currentStop) {
    return { shouldNotify: false, deviated: false };
  }

  const distanceToCurrentStopMeters = getDistance(coordinates, currentStop.place.coordinates);
  const distanceToNextStopMeters = nextStop ? getDistance(coordinates, nextStop.place.coordinates) : 0;
  const minutesUntilNextStop = nextStop
    ? differenceInMinutes(parseISO(nextStop.startTime), parseISO(nowIso))
    : 99;
  const minutesBehind = nextStop
    ? Math.max(0, differenceInMinutes(parseISO(nowIso), parseISO(nextStop.startTime)))
    : 0;

  return {
    shouldNotify: shouldTriggerDepartureAlert({
      distanceToCurrentStopMeters,
      minutesUntilNextStop,
      lastAlertAt: session.lastAlertAt,
      nowIso,
    }),
    deviated: detectDeviation({
      distanceToNextStopMeters,
      minutesBehind,
    }),
    nextStopName: nextStop?.place.name,
  };
};
