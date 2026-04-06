import * as SplashScreen from "expo-splash-screen";
import { useEffect, useMemo, useState } from "react";

import i18n from "../lib/i18n";
import { seedRanking, seedSharedRoutes } from "../data/seed";
import { bootstrapAuth } from "../services/auth-service";
import { useAppStore } from "../stores/app-store";

void SplashScreen.preventAutoHideAsync();

export const useBootstrap = () => {
  const hydrated = useAppStore((state) => state.hydrated);
  const locale = useAppStore((state) => state.locale);
  const sharedItineraries = useAppStore((state) => state.sharedItineraries);
  const rankings = useAppStore((state) => state.rankings);
  const { setUserProfile } = useAppStore((state) => state.actions);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    i18n.changeLanguage(locale);
  }, [locale]);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    let cancelled = false;

    bootstrapAuth()
      .then((profile) => {
        if (!cancelled) {
          setUserProfile(profile);
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
  }, [hydrated, setUserProfile]);

  const seededDataReady = useMemo(
    () => sharedItineraries.length > 0 || rankings.length > 0 || seedSharedRoutes.length > 0 || seedRanking.length > 0,
    [rankings.length, sharedItineraries.length]
  );

  return hydrated && authReady && seededDataReady;
};
