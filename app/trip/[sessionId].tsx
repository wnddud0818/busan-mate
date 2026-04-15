import { router, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";

import { Screen } from "../../src/components/common/screen";
import { SectionCard } from "../../src/components/common/section-card";
import { buildIndoorFallback } from "../../src/features/itinerary/planner";
import { evaluateCurrentLocation, openNavigationLink, requestLiveGuidePermissions } from "../../src/services/location-service";
import { startBackgroundTracking } from "../../src/services/location-tasks";
import { useAppStore } from "../../src/stores/app-store";
import { colors, radii, spacing } from "../../src/theme/tokens";

export default function LiveGuidePage() {
  const params = useLocalSearchParams<{ sessionId: string }>();
  const locale = useAppStore((state) => state.locale);
  const activeSession = useAppStore((state) => state.activeSession);
  const itinerary = useAppStore((state) =>
    state.itineraries.find((item) => item.id === activeSession?.itineraryId)
  );
  const { addLocationEvent, setLocationConsent, updateSession, upsertItinerary } =
    useAppStore((state) => state.actions);
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

  const enableGuidance = async () => {
    const granted = await requestLiveGuidePermissions();
    const nextSession = {
      ...activeSession,
      locationConsent: granted,
    };
    updateSession(nextSession);
    setLocationConsent(granted);

    if (granted) {
      await startBackgroundTracking(itinerary, nextSession);
      Alert.alert("Busan Mate", locale === "ko" ? "위치 가이드가 켜졌어요." : "Live location guidance is now on.");
    } else {
      Alert.alert("Busan Mate", locale === "ko" ? "수동 가이드로 계속 진행합니다." : "Continuing in manual guide mode.");
    }
  };

  const checkLocationNow = async () => {
    try {
      const snapshot = await evaluateCurrentLocation(itinerary, activeSession);
      addLocationEvent(snapshot.event);
      if (snapshot.status.deviated) {
        setStatusMessage(
          locale === "ko"
            ? "일정 이탈이 감지되어 실내 대체 코스를 추천합니다."
            : "Schedule drift detected. Try the indoor fallback route."
        );
      } else if (snapshot.status.shouldNotify) {
        setStatusMessage(
          locale === "ko" ? "다음 장소로 이동할 시점이 가까워졌어요." : "It is almost time to leave for the next stop."
        );
      } else {
        setStatusMessage(locale === "ko" ? "현재 루트를 잘 따라가고 있어요." : "You are tracking the route well.");
      }
    } catch {
      setStatusMessage(locale === "ko" ? "현재 위치를 확인하지 못했어요." : "Unable to read your current location.");
    }
  };

  const rerouteIndoors = () => {
    const fallback = buildIndoorFallback(itinerary);
    upsertItinerary(fallback);
    router.push(`/itinerary/${fallback.id}`);
  };

  return (
    <Screen title={locale === "ko" ? "실시간 가이드" : "Live guide"} subtitle={itinerary.title[locale]}>
      <SectionCard title={currentStop.place.name[locale]} hint={currentStop.place.description[locale]}>
        <Text style={styles.copy}>
          {locale === "ko"
            ? `현재 ${currentStop.place.district} 구간을 안내 중입니다.`
            : `Currently guiding you through ${currentStop.place.district}.`}
        </Text>
        {nextStop ? (
          <Text style={styles.next}>
            {locale === "ko" ? "다음 이동" : "Next move"}: {nextStop.place.name[locale]}
          </Text>
        ) : null}
      </SectionCard>

      <SectionCard title={locale === "ko" ? "가이드 액션" : "Guide actions"}>
        <View style={styles.buttonGrid}>
          <Pressable style={styles.primaryButton} onPress={enableGuidance}>
            <Text style={styles.primaryText}>{locale === "ko" ? "위치 가이드 켜기" : "Enable location guide"}</Text>
          </Pressable>
          <Pressable style={styles.secondaryButton} onPress={checkLocationNow}>
            <Text style={styles.secondaryText}>{locale === "ko" ? "지금 위치 확인" : "Check my location"}</Text>
          </Pressable>
          <Pressable style={styles.secondaryButton} onPress={rerouteIndoors}>
            <Text style={styles.secondaryText}>{locale === "ko" ? "실내 대체 루트" : "Indoor fallback route"}</Text>
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
            <Text style={styles.secondaryText}>{locale === "ko" ? "외부 길안내/예약" : "Open maps / booking"}</Text>
          </Pressable>
        </View>
      </SectionCard>

      {statusMessage ? (
        <SectionCard>
          <Text style={styles.copy}>{statusMessage}</Text>
        </SectionCard>
      ) : null}

      <Pressable style={styles.chatButton} onPress={() => router.push(`/trip/${activeSession.id}/guide`)}>
        <Text style={styles.chatText}>{locale === "ko" ? "가이드에게 물어보기" : "Ask the guide"}</Text>
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
