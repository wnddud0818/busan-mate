import { router, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";

import { Screen } from "../../src/components/common/screen";
import { SectionCard } from "../../src/components/common/section-card";
import { buildIndoorFallback } from "../../src/features/itinerary/planner";
import {
  clearTrackingState,
  evaluateCurrentLocation,
  openNavigationLink,
  requestLiveGuidePermissions,
  saveTrackingState,
} from "../../src/services/location-service";
import { startBackgroundTracking, stopBackgroundTracking } from "../../src/services/location-tasks";
import { ingestLocationEvent, syncLiveSession } from "../../src/services/session-service";
import { useAppStore } from "../../src/stores/app-store";
import { colors, radii, spacing } from "../../src/theme/tokens";

export default function LiveGuidePage() {
  const params = useLocalSearchParams<{ sessionId: string }>();
  const locale = useAppStore((state) => state.locale);
  const profile = useAppStore((state) => state.userProfile);
  const activeSession = useAppStore((state) => state.activeSession);
  const itinerary = useAppStore((state) =>
    state.itineraries.find((item) => item.id === activeSession?.itineraryId)
  );
  const {
    addLocationEvent,
    setLocationConsent,
    updateSession,
    upsertItinerary,
    advanceSession,
    completeSession,
  } = useAppStore((state) => state.actions);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const currentStop = useMemo(() => {
    if (!itinerary || !activeSession) {
      return undefined;
    }

    return itinerary.days[activeSession.currentDay - 1]?.stops[activeSession.currentStopOrder - 1];
  }, [activeSession, itinerary]);

  const nextStop = useMemo(() => {
    if (!itinerary || !activeSession) {
      return undefined;
    }

    return itinerary.days[activeSession.currentDay - 1]?.stops[activeSession.currentStopOrder];
  }, [activeSession, itinerary]);

  if (!activeSession || params.sessionId !== activeSession.id || !itinerary || !currentStop) {
    return (
      <Screen title="Live guide">
        <Text style={{ color: "white" }}>No active session.</Text>
      </Screen>
    );
  }

  const persistSyncedSession = async (nextItinerary = itinerary, nextSession = activeSession) => {
    upsertItinerary(nextItinerary);
    updateSession(nextSession);
    await saveTrackingState(nextItinerary, nextSession);
  };

  const enableGuidance = async () => {
    const granted = await requestLiveGuidePermissions();
    const nextSession = {
      ...activeSession,
      locationConsent: granted,
    };

    setLocationConsent(granted);
    const result = await syncLiveSession({
      itinerary,
      session: nextSession,
      userProfile: profile,
    });

    await persistSyncedSession(result.itinerary, result.session);

    if (granted) {
      await startBackgroundTracking(result.itinerary, result.session);
      Alert.alert("Busan Mate", locale === "ko" ? "?꾩튂 媛?대뱶媛 耳쒖죱?댁슂." : "Live location guidance is now on.");
    } else {
      Alert.alert("Busan Mate", locale === "ko" ? "?섎룞 媛?대뱶濡?怨꾩냽 吏꾪뻾?⑸땲??" : "Continuing in manual guide mode.");
    }
  };

  const checkLocationNow = async () => {
    try {
      const snapshot = await evaluateCurrentLocation(itinerary, activeSession);
      const nextSession = {
        ...activeSession,
        lastAlertAt: snapshot.status.shouldNotify ? new Date().toISOString() : activeSession.lastAlertAt,
      };
      const result = await ingestLocationEvent({
        itinerary,
        session: nextSession,
        event: snapshot.event,
        userProfile: profile,
      });

      addLocationEvent(result.event);
      updateSession(result.session);
      await saveTrackingState(itinerary, result.session);

      if (snapshot.status.deviated) {
        setStatusMessage(
          locale === "ko"
            ? "?쇱젙 ?댄깉??媛먯??섏뼱 ?ㅻ궡 ?泥?肄붿뒪瑜?異붿쿇?⑸땲??"
            : "Schedule drift detected. Try the indoor fallback route."
        );
      } else if (snapshot.status.shouldNotify) {
        setStatusMessage(
          locale === "ko" ? "?ㅼ쓬 ?μ냼濡??대룞???쒖젏??媛源뚯썙議뚯뼱??" : "It is almost time to leave for the next stop."
        );
      } else {
        setStatusMessage(locale === "ko" ? "?꾩옱 猷⑦듃瑜????곕씪媛怨??덉뼱??" : "You are tracking the route well.");
      }
    } catch {
      setStatusMessage(locale === "ko" ? "?꾩옱 ?꾩튂瑜??뺤씤?섏? 紐삵뻽?댁슂." : "Unable to read your current location.");
    }
  };

  const moveToNextStop = async () => {
    const nextSession = advanceSession();
    if (!nextSession) {
      return;
    }

    const result = await syncLiveSession({
      itinerary,
      session: nextSession,
      userProfile: profile,
    });

    if (result.session.status === "completed") {
      await stopBackgroundTracking();
      await clearTrackingState();
      updateSession(result.session);
      router.replace(`/itinerary/${itinerary.id}`);
      return;
    }

    await persistSyncedSession(result.itinerary, result.session);
  };

  const endSession = async () => {
    const nextSession = completeSession();
    if (!nextSession) {
      return;
    }

    const result = await syncLiveSession({
      itinerary,
      session: nextSession,
      userProfile: profile,
    });

    await stopBackgroundTracking();
    await clearTrackingState();
    updateSession(result.session);
    router.replace(`/itinerary/${itinerary.id}`);
  };

  const rerouteIndoors = () => {
    const fallback = buildIndoorFallback(itinerary);
    upsertItinerary(fallback);
    router.push(`/itinerary/${fallback.id}`);
  };

  return (
    <Screen title={locale === "ko" ? "?ㅼ떆媛?媛?대뱶" : "Live guide"} subtitle={itinerary.title[locale]}>
      <SectionCard title={currentStop.place.name[locale]} hint={currentStop.place.description[locale]}>
        <Text style={styles.copy}>
          {locale === "ko"
            ? `?꾩옱 ${currentStop.place.district} 援ш컙???덈궡 以묒엯?덈떎.`
            : `Currently guiding you through ${currentStop.place.district}.`}
        </Text>
        {nextStop ? (
          <Text style={styles.next}>
            {locale === "ko" ? "?ㅼ쓬 ?대룞" : "Next move"}: {nextStop.place.name[locale]}
          </Text>
        ) : null}
      </SectionCard>

      <SectionCard title={locale === "ko" ? "媛?대뱶 ?≪뀡" : "Guide actions"}>
        <View style={styles.buttonGrid}>
          <Pressable style={styles.primaryButton} onPress={enableGuidance}>
            <Text style={styles.primaryText}>{locale === "ko" ? "?꾩튂 媛?대뱶 耳쒓린" : "Enable location guide"}</Text>
          </Pressable>
          <Pressable style={styles.secondaryButton} onPress={checkLocationNow}>
            <Text style={styles.secondaryText}>{locale === "ko" ? "吏湲??꾩튂 ?뺤씤" : "Check my location"}</Text>
          </Pressable>
          <Pressable style={styles.secondaryButton} onPress={moveToNextStop}>
            <Text style={styles.secondaryText}>{locale === "ko" ? "?ㅼ쓬 ?대룞" : "Next move"}</Text>
          </Pressable>
          <Pressable style={styles.secondaryButton} onPress={rerouteIndoors}>
            <Text style={styles.secondaryText}>{locale === "ko" ? "?ㅻ궡 ?泥?猷⑦듃" : "Indoor fallback route"}</Text>
          </Pressable>
          <Pressable style={styles.secondaryButton} onPress={endSession}>
            <Text style={styles.secondaryText}>{locale === "ko" ? "?몃꽭??醫낅즺" : "End session"}</Text>
          </Pressable>
          <Pressable
            style={styles.secondaryButton}
            onPress={() =>
              openNavigationLink(
                currentStop.place.bookingUrl ??
                  `https://maps.google.com/?q=${currentStop.place.coordinates.latitude},${currentStop.place.coordinates.longitude}`
              )
            }
          >
            <Text style={styles.secondaryText}>{locale === "ko" ? "?몃? 湲몄븞???덉빟" : "Open maps / booking"}</Text>
          </Pressable>
        </View>
      </SectionCard>

      {statusMessage ? (
        <SectionCard>
          <Text style={styles.copy}>{statusMessage}</Text>
        </SectionCard>
      ) : null}

      <Pressable style={styles.chatButton} onPress={() => router.push(`/trip/${activeSession.id}/guide`)}>
        <Text style={styles.chatText}>{locale === "ko" ? "媛?대뱶?먭쾶 臾쇱뼱蹂닿린" : "Ask the guide"}</Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  copy: {
    color: "rgba(248,251,253,0.8)",
    lineHeight: 20,
  },
  next: {
    color: colors.mint,
    fontWeight: "700",
  },
  buttonGrid: {
    gap: spacing.sm,
  },
  primaryButton: {
    borderRadius: radii.md,
    backgroundColor: colors.coral,
    paddingVertical: spacing.md,
    alignItems: "center",
  },
  primaryText: {
    color: colors.navy,
    fontWeight: "800",
  },
  secondaryButton: {
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: "rgba(255,255,255,0.06)",
    paddingVertical: spacing.md,
    alignItems: "center",
  },
  secondaryText: {
    color: colors.cloud,
    fontWeight: "700",
  },
  chatButton: {
    borderRadius: radii.md,
    backgroundColor: colors.sand,
    paddingVertical: spacing.md,
    alignItems: "center",
  },
  chatText: {
    color: colors.navy,
    fontWeight: "800",
  },
});
