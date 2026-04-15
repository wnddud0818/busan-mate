import * as SplashScreen from "expo-splash-screen";
import { useEffect, useMemo, useState } from "react";

import { seedRanking, seedSharedRoutes } from "../data/seed";
import i18n from "../lib/i18n";
import { bootstrapAuth } from "../services/auth-service";
import { readTrackingState } from "../services/location-service";
import { useAppStore } from "../stores/app-store";

void SplashScreen.preventAutoHideAsync();

export const useBootstrap = () => {
  const hydrated = useAppStore((state) => state.hydrated);
  const locale = useAppStore((state) => state.locale);
  const sharedItineraries = useAppStore((state) => state.sharedItineraries);
  const rankings = useAppStore((state) => state.rankings);
  const { restoreTrackingState, setUserProfile } = useAppStore((state) => state.actions);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    i18n.changeLanguage(locale);
  }, [locale]);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    let cancelled = false;

    Promise.all([bootstrapAuth(), readTrackingState()])
      .then(([profile, trackingState]) => {
        if (!cancelled) {
          setUserProfile(profile);
          restoreTrackingState(trackingState);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setAuthReady(true);
          SplashScreen.hideAsync();
        }
      });

    return () => {
      cancelled = true;
    };
  }, [hydrated, restoreTrackingState, setUserProfile]);

  const seededDataReady = useMemo(
    () => sharedItineraries.length > 0 || rankings.length > 0 || seedSharedRoutes.length > 0 || seedRanking.length > 0,
    [rankings.length, sharedItineraries.length]
  );

  return hydrated && authReady && seededDataReady;
};
