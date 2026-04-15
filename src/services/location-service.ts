import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Linking from "expo-linking";
import * as Location from "expo-location";

import { createLocationEvent, evaluateTrackingUpdate } from "../features/location/guidance";
import { supportsBackgroundLiveGuide } from "../lib/expo-runtime";
import { Itinerary, TripSession } from "../types/domain";

export const TRACKING_STATE_KEY = "busan-mate-tracking-state";
export const LOCATION_TASK_NAME = "busan-mate-live-location";

export type TrackingState = {
  itinerary: Itinerary;
  session: TripSession;
};

export const requestLiveGuidePermissions = async () => {
  if (!supportsBackgroundLiveGuide) {
    return false;
  }

  try {
    const foreground = await Location.requestForegroundPermissionsAsync();
    if (foreground.status !== "granted") {
      return false;
    }

    const Notifications = await import("expo-notifications");
    const notification = await Notifications.requestPermissionsAsync();
    if (notification.status !== "granted") {
      return false;
    }

    const background = await Location.requestBackgroundPermissionsAsync();
    return background.status === "granted";
  } catch (error) {
    console.warn("[location-service] Unable to request live guide permissions.", error);
    return false;
  }
};

export const openNavigationLink = async (url: string) => {
  await Linking.openURL(url);
};

export const saveTrackingState = async (itinerary: Itinerary, session: TripSession) => {
  await AsyncStorage.setItem(
    TRACKING_STATE_KEY,
    JSON.stringify({
      itinerary,
      session,
    })
  );
};

export const clearTrackingState = async () => {
  await AsyncStorage.removeItem(TRACKING_STATE_KEY);
};

export const readTrackingState = async (): Promise<TrackingState | null> => {
  const stored = await AsyncStorage.getItem(TRACKING_STATE_KEY);
  if (!stored) {
    return null;
  }

  try {
    return JSON.parse(stored) as TrackingState;
  } catch {
    await AsyncStorage.removeItem(TRACKING_STATE_KEY);
    return null;
  }
};

export const evaluateCurrentLocation = async (itinerary: Itinerary, session: TripSession) => {
  const position = await Location.getCurrentPositionAsync({});
  const coordinates = {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
  };

  return {
    event: createLocationEvent({
      session,
      coordinates,
      consented: session.locationConsent,
    }),
    status: evaluateTrackingUpdate({
      itinerary,
      session,
      coordinates,
      nowIso: new Date().toISOString(),
    }),
  };
};
