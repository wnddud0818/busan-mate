import * as Location from "expo-location";
import * as Notifications from "expo-notifications";
import * as TaskManager from "expo-task-manager";
import { Platform } from "react-native";

import { readStoredProfile } from "./auth-service";
import { createLocationEvent, evaluateTrackingUpdate } from "../features/location/guidance";
import { Itinerary, TripSession } from "../types/domain";
import { LOCATION_TASK_NAME, readTrackingState, saveTrackingState } from "./location-service";
import { ingestLocationEvent } from "./session-service";

if (!TaskManager.isTaskDefined(LOCATION_TASK_NAME)) {
  TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
    if (error || !data) {
      return;
    }

    const payload = data as { locations?: Array<{ coords: { latitude: number; longitude: number } }> };
    const latest = payload.locations?.at(-1);
    if (!latest) {
      return;
    }

    const trackingState = await readTrackingState();
    if (!trackingState) {
      return;
    }

    const { itinerary, session } = trackingState;
    const nowIso = new Date().toISOString();
    const result = evaluateTrackingUpdate({
      itinerary,
      session,
      coordinates: latest.coords,
      nowIso,
    });

    if (result.shouldNotify) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "Busan Mate",
          body: result.deviated
            ? "일정이 조금 밀리고 있어요. 실내 대체 루트를 열어볼까요?"
            : "다음 장소로 이동할 시간이 가까워졌어요.",
        },
        trigger: null,
      });
    }

    const nextSession: TripSession = {
      ...session,
      lastAlertAt: result.shouldNotify ? nowIso : session.lastAlertAt,
    };

    const localEvent = createLocationEvent({
      session: nextSession,
      coordinates: latest.coords,
      consented: nextSession.locationConsent,
    });
    const profile = await readStoredProfile();
    const ingested = await ingestLocationEvent({
      itinerary,
      session: nextSession,
      event: localEvent,
      userProfile: profile ?? undefined,
    });

    await saveTrackingState(itinerary, ingested.session);
  });
}

export const startBackgroundTracking = async (itinerary: Itinerary, session: TripSession) => {
  if (Platform.OS === "web") {
    return;
  }

  await saveTrackingState(itinerary, session);

  const isStarted = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
  if (isStarted) {
    return;
  }

  await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
    accuracy: Location.Accuracy.Balanced,
    timeInterval: 1000 * 60 * 5,
    distanceInterval: 150,
    showsBackgroundLocationIndicator: false,
    pausesUpdatesAutomatically: true,
  });
};

export const stopBackgroundTracking = async () => {
  if (Platform.OS === "web") {
    return;
  }

  const isStarted = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
  if (isStarted) {
    await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
  }
};
