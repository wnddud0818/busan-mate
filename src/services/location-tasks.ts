import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import * as Notifications from "expo-notifications";
import * as TaskManager from "expo-task-manager";
import { Platform } from "react-native";

import { createLocationEvent, evaluateTrackingUpdate } from "../features/location/guidance";
import { Itinerary, TripSession } from "../types/domain";
import { LOCATION_TASK_NAME, TRACKING_STATE_KEY } from "./location-service";

type TrackingState = {
  itinerary: Itinerary;
  session: TripSession;
};

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

    const stored = await AsyncStorage.getItem(TRACKING_STATE_KEY);
    if (!stored) {
      return;
    }

    const { itinerary, session } = JSON.parse(stored) as TrackingState;
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

    const nextPayload: TrackingState = {
      itinerary,
      session: nextSession,
    };

    await AsyncStorage.setItem(TRACKING_STATE_KEY, JSON.stringify(nextPayload));
    createLocationEvent({
      session: nextSession,
      coordinates: latest.coords,
      consented: nextSession.locationConsent,
    });
  });
}

export const startBackgroundTracking = async (itinerary: Itinerary, session: TripSession) => {
  if (Platform.OS === "web") {
    return;
  }

  await AsyncStorage.setItem(
    TRACKING_STATE_KEY,
    JSON.stringify({
      itinerary,
      session,
    })
  );

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
