import { Feather } from "@expo/vector-icons";
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
    if (!itinerary || !activeSession) return undefined;
    return itinerary.days[activeSession.currentDay - 1]?.stops[activeSession.currentStopOrder - 1];
  }, [activeSession, itinerary]);

  const nextStop = useMemo(() => {
    if (!itinerary || !activeSession) return undefined;
    return itinerary.days[activeSession.currentDay - 1]?.stops[activeSession.currentStopOrder];
  }, [activeSession, itinerary]);

  if (!activeSession || params.sessionId !== activeSession.id || !itinerary || !currentStop) {
    return (
      <Screen title={locale === "ko" ? "실시간 가이드" : "Live guide"} showBack>
        <Text style={{ color: colors.mist }}>
          {locale === "ko" ? "활성 세션이 없어요." : "No active session."}
        </Text>
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
    const nextSession = { ...activeSession, locationConsent: granted };
    setLocationConsent(granted);
    const result = await syncLiveSession({ itinerary, session: nextSession, userProfile: profile });
    await persistSyncedSession(result.itinerary, result.session);
    if (granted) {
      await startBackgroundTracking(result.itinerary, result.session);
      Alert.alert(
        "Busan Mate",
        locale === "ko" ? "실시간 위치 가이드가 켜졌어요." : "Live location guidance is now on."
      );
    } else {
      Alert.alert(
        "Busan Mate",
        locale === "ko" ? "수동 가이드 모드로 계속해요." : "Continuing in manual guide mode."
      );
    }
  };

  const checkLocationNow = async () => {
    try {
      const snapshot = await evaluateCurrentLocation(itinerary, activeSession);
      const nextSession = {
        ...activeSession,
        lastAlertAt: snapshot.status.shouldNotify
          ? new Date().toISOString()
          : activeSession.lastAlertAt,
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
            ? "일정 경로를 벗어났어요. 실내 대체 루트를 권장해요."
            : "Schedule drift detected. Try the indoor fallback route."
        );
      } else if (snapshot.status.shouldNotify) {
        setStatusMessage(
          locale === "ko" ? "다음 장소로 이동할 시간이 다가왔어요." : "Almost time to leave for the next stop."
        );
      } else {
        setStatusMessage(
          locale === "ko" ? "현재 루트를 잘 따라가고 있어요." : "You are tracking the route well."
        );
      }
    } catch {
      setStatusMessage(
        locale === "ko" ? "현재 위치를 확인하지 못했어요." : "Unable to read your current location."
      );
    }
  };

  const moveToNextStop = async () => {
    const nextSession = advanceSession();
    if (!nextSession) return;
    const result = await syncLiveSession({ itinerary, session: nextSession, userProfile: profile });
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
    if (!nextSession) return;
    const result = await syncLiveSession({ itinerary, session: nextSession, userProfile: profile });
    await stopBackgroundTracking();
    await clearTrackingState();
    updateSession(result.session);
    router.replace(`/itinerary/${itinerary.id}`);
  };

  const rerouteIndoors = async () => {
    const fallback = buildIndoorFallback(itinerary);
    upsertItinerary(fallback);
    await stopBackgroundTracking();
    await clearTrackingState();
    router.push(`/itinerary/${fallback.id}`);
  };

  return (
    <Screen
      title={locale === "ko" ? "실시간 가이드" : "Live guide"}
      subtitle={itinerary.title[locale]}
      showBack
    >
      {/* ── 현재 장소 ── */}
      <SectionCard variant="highlight" title={currentStop.place.name[locale]}>
        <Text style={styles.districtCopy}>
          {locale === "ko"
            ? `현재 ${currentStop.place.district} 구역을 안내하고 있어요.`
            : `Currently guiding you through ${currentStop.place.district}.`}
        </Text>
        {nextStop ? (
          <View style={styles.nextRow}>
            <Feather name="arrow-right-circle" size={14} color={colors.mint} />
            <Text style={styles.nextCopy}>
              {locale === "ko" ? "다음" : "Next"}:{" "}
              <Text style={styles.nextName}>{nextStop.place.name[locale]}</Text>
            </Text>
          </View>
        ) : null}
      </SectionCard>

      {/* ── 가이드 액션 ── */}
      <SectionCard title={locale === "ko" ? "가이드 기능" : "Guide actions"}>
        {/* 주요 액션 */}
        <Pressable style={styles.primaryBtn} onPress={enableGuidance}>
          <Feather name="radio" size={16} color={colors.navy} />
          <Text style={styles.primaryBtnText}>
            {locale === "ko" ? "위치 가이드 켜기" : "Enable location guide"}
          </Text>
        </Pressable>

        {/* 보조 액션 그리드 */}
        <View style={styles.actionGrid}>
          {[
            {
              icon: "crosshair" as const,
              label: locale === "ko" ? "지금 위치 확인" : "Check location",
              onPress: checkLocationNow,
            },
            {
              icon: "skip-forward" as const,
              label: locale === "ko" ? "다음 이동" : "Next move",
              onPress: moveToNextStop,
            },
            {
              icon: "home" as const,
              label: locale === "ko" ? "실내 대체" : "Indoor fallback",
              onPress: rerouteIndoors,
            },
            {
              icon: "map" as const,
              label: locale === "ko" ? "지도 / 예약" : "Maps / booking",
              onPress: () =>
                openNavigationLink(
                  currentStop.place.bookingUrl ??
                    `https://maps.google.com/?q=${currentStop.place.coordinates.latitude},${currentStop.place.coordinates.longitude}`
                ),
            },
          ].map(({ icon, label, onPress }) => (
            <Pressable key={icon} style={styles.gridBtn} onPress={onPress}>
              <Feather name={icon} size={16} color={colors.cloud} />
              <Text style={styles.gridBtnText}>{label}</Text>
            </Pressable>
          ))}
        </View>

        {/* 세션 종료 */}
        <Pressable style={styles.dangerBtn} onPress={endSession}>
          <Feather name="x-circle" size={15} color={colors.error} />
          <Text style={styles.dangerBtnText}>
            {locale === "ko" ? "세션 종료" : "End session"}
          </Text>
        </Pressable>
      </SectionCard>

      {/* ── 상태 메시지 ── */}
      {statusMessage ? (
        <SectionCard>
          <View style={styles.statusRow}>
            <Feather name="info" size={14} color={colors.mint} />
            <Text style={styles.statusText}>{statusMessage}</Text>
          </View>
        </SectionCard>
      ) : null}

      {/* ── AI 가이드 채팅 ── */}
      <Pressable style={styles.chatBtn} onPress={() => router.push(`/trip/${activeSession.id}/guide`)}>
        <Feather name="message-circle" size={18} color={colors.navy} />
        <Text style={styles.chatBtnText}>
          {locale === "ko" ? "가이드에게 질문하기" : "Ask the guide"}
        </Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  districtCopy: {
    color: "rgba(248,251,253,0.82)",
    fontSize: 14,
    lineHeight: 21,
  },
  nextRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  nextCopy: {
    color: colors.mist,
    fontSize: 13,
  },
  nextName: {
    color: colors.mint,
    fontWeight: "700",
  },
  primaryBtn: {
    borderRadius: radii.md,
    backgroundColor: colors.coral,
    paddingVertical: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  primaryBtnText: {
    color: colors.navy,
    fontWeight: "800",
    fontSize: 15,
  },
  actionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  gridBtn: {
    flex: 1,
    minWidth: "45%",
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: "rgba(255,255,255,0.06)",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    alignItems: "center",
    gap: 6,
  },
  gridBtnText: {
    color: colors.cloud,
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
  },
  dangerBtn: {
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: "rgba(255,90,90,0.28)",
    backgroundColor: "rgba(255,90,90,0.08)",
    paddingVertical: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  dangerBtnText: {
    color: colors.error,
    fontWeight: "700",
    fontSize: 14,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  statusText: {
    color: "rgba(248,251,253,0.82)",
    flex: 1,
    lineHeight: 20,
    fontSize: 14,
  },
  chatBtn: {
    borderRadius: radii.md,
    backgroundColor: colors.sand,
    paddingVertical: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  chatBtnText: {
    color: colors.navy,
    fontWeight: "900",
    fontSize: 16,
  },
});
