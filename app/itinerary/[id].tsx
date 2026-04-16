import { Feather } from "@expo/vector-icons";
import { useMutation } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";

import { GuestUpgradeCard } from "../../src/components/common/guest-upgrade-card";
import { Screen } from "../../src/components/common/screen";
import { SectionCard } from "../../src/components/common/section-card";
import { StopCard } from "../../src/components/itinerary/stop-card";
import { sendMagicLink } from "../../src/services/auth-service";
import {
  openNavigationLink,
  requestLiveGuidePermissions,
  saveTrackingState,
} from "../../src/services/location-service";
import { publishItinerary } from "../../src/services/publish-service";
import { rateItinerary } from "../../src/services/rating-service";
import { syncLiveSession } from "../../src/services/session-service";
import { useAppStore } from "../../src/stores/app-store";
import { colors, radii, spacing } from "../../src/theme/tokens";
import { formatKrwCompact, formatKrwFull } from "../../src/utils/currency";

export default function ItineraryDetailPage() {
  const params = useLocalSearchParams<{ id: string }>();
  const locale = useAppStore((state) => state.locale);
  const itinerary = useAppStore((state) => state.itineraries.find((item) => item.id === params.id));
  const profile = useAppStore((state) => state.userProfile);
  const {
    startSession,
    updateSession,
    setUserProfile,
    upsertItinerary,
    upsertSharedItinerary,
    setLocationConsent,
  } = useAppStore((state) => state.actions);
  const { t } = useTranslation();

  const publishMutation = useMutation({
    mutationFn: async () => {
      if (!itinerary) throw new Error("Missing itinerary");
      return publishItinerary({ itinerary, userProfile: profile });
    },
    onSuccess: (result) => {
      if (result.upgradeRequired) {
        Alert.alert(
          locale === "ko" ? "업그레이드 필요" : "Upgrade required",
          locale === "ko"
            ? "공유하려면 매직 링크 로그인으로 전환해 주세요."
            : "Use a magic link before publishing."
        );
        return;
      }
      upsertItinerary(result.itinerary);
      upsertSharedItinerary(result.shared);
      if (result.syncStatus === "pending") {
        Alert.alert(
          "Busan Mate",
          locale === "ko"
            ? "원격 저장에 실패해 우선 로컬에만 저장했어요."
            : "Remote sync failed, saved locally for now."
        );
      }
    },
  });

  const ratingMutation = useMutation({
    mutationFn: async () => {
      if (!itinerary) throw new Error("Missing itinerary");
      return rateItinerary({ itinerary, rating: 5, userProfile: profile });
    },
    onSuccess: (result) => {
      upsertItinerary(result.itinerary);
      if (result.shared) upsertSharedItinerary(result.shared);
    },
  });

  if (!itinerary) {
    return (
      <Screen title="Busan Mate" showBack>
        <Text style={{ color: colors.mist }}>
          {locale === "ko" ? "일정을 찾을 수 없어요." : "Itinerary not found."}
        </Text>
      </Screen>
    );
  }

  const placeSpendTotalKrw = itinerary.days.reduce(
    (total, day) =>
      total +
      day.stops.reduce(
        (dayTotal, stop) => dayTotal + stop.place.estimatedSpendKrw * itinerary.preferences.partySize,
        0
      ),
    0
  );
  const transitSpendTotalKrw = itinerary.days.reduce(
    (total, day) =>
      total +
      day.stops.reduce(
        (dayTotal, stop) =>
          dayTotal + (stop.transitFromPrevious?.estimatedFareKrw ?? 0) * itinerary.preferences.partySize,
        0
      ),
    0
  );

  const launchSession = async ({
    askPermission,
    destination,
  }: {
    askPermission: boolean;
    destination: "guide" | "live";
  }) => {
    const draftSession = startSession(itinerary);
    const permissionGranted = askPermission ? await requestLiveGuidePermissions() : false;
    const nextSession = { ...draftSession, locationConsent: permissionGranted };
    setLocationConsent(permissionGranted);
    const result = await syncLiveSession({ itinerary, session: nextSession, userProfile: profile });
    upsertItinerary(result.itinerary);
    updateSession(result.session);
    await saveTrackingState(result.itinerary, result.session);
    router.push(
      destination === "live" ? `/trip/${result.session.id}` : `/trip/${result.session.id}/guide`
    );
  };

  const isPublished = itinerary.shareStatus === "published";

  return (
    <Screen title={itinerary.title[locale]} subtitle={itinerary.summary[locale]} showBack>
      {/* ── 예산·날씨 요약 ── */}
      <SectionCard>
        <Text style={styles.budgetLabel}>
          {itinerary.planningMeta
            ? itinerary.planningMeta.budgetSummary.summary[locale]
            : itinerary.estimatedBudgetLabel[locale]}
        </Text>
        {itinerary.planningMeta ? (
          <View style={styles.metaStack}>
            <View style={styles.metaRow}>
              <Feather name="dollar-sign" size={13} color={colors.mint} />
              <Text style={styles.metaCopy}>
                {locale === "ko"
                  ? `총 ${formatKrwFull(itinerary.planningMeta.budgetSummary.estimatedTotalKrw, locale)} / 1인 ${formatKrwCompact(itinerary.planningMeta.budgetSummary.estimatedPerPersonKrw, locale)}`
                  : `Total ${formatKrwFull(itinerary.planningMeta.budgetSummary.estimatedTotalKrw, locale)} / ${formatKrwCompact(itinerary.planningMeta.budgetSummary.estimatedPerPersonKrw, locale)} per person`}
              </Text>
            </View>
            <View style={styles.metaRow}>
              <Feather name="cloud" size={13} color={colors.mint} />
              <Text style={styles.metaCopy}>
                {itinerary.planningMeta.weatherSnapshot.summary[locale]}
              </Text>
            </View>
            <View style={styles.metaRow}>
              <Feather name="map-pin" size={13} color={colors.mint} />
              <Text style={styles.metaCopy}>
                {locale === "ko"
                  ? `${itinerary.planningMeta.startArea.name.ko} 출발`
                  : `Starting near ${itinerary.planningMeta.startArea.name.en}`}
              </Text>
            </View>
          </View>
        ) : null}

        {/* 메인 액션 */}
        <View style={styles.actionGroup}>
          <Pressable
            style={styles.primaryBtn}
            onPress={() => launchSession({ askPermission: true, destination: "live" })}
          >
            <Feather name="navigation" size={16} color={colors.navy} />
            <Text style={styles.primaryBtnText}>{t("itinerary.startGuide")}</Text>
          </Pressable>
          <Pressable style={styles.secondaryBtn} onPress={() => publishMutation.mutate()}>
            <Feather name={isPublished ? "check-circle" : "share-2"} size={16} color={colors.cloud} />
            <Text style={styles.secondaryBtnText}>
              {isPublished ? t("itinerary.published") : t("itinerary.publish")}
            </Text>
          </Pressable>
        </View>

        {/* 보조 액션 */}
        <View style={styles.inlineGroup}>
          <Pressable
            style={styles.inlineBtn}
            onPress={() => launchSession({ askPermission: false, destination: "guide" })}
          >
            <Feather name="message-circle" size={13} color={colors.cloud} />
            <Text style={styles.inlineBtnText}>{t("itinerary.askGuide")}</Text>
          </Pressable>
          <Pressable style={styles.inlineBtn} onPress={() => ratingMutation.mutate()}>
            <Feather name="star" size={13} color={colors.sand} />
            <Text style={styles.inlineBtnText}>
              {locale === "ko" ? "5점 남기기" : "Rate 5.0"}
            </Text>
          </Pressable>
        </View>
      </SectionCard>

      {/* ── 계정 업그레이드 ── */}
      {profile?.isAnonymous ? (
        <GuestUpgradeCard
          locale={locale}
          onSend={async (email) => {
            const upgraded = await sendMagicLink(email, locale);
            setUserProfile(upgraded);
          }}
        />
      ) : null}

      {/* ── 일별 일정 ── */}
      {itinerary.days.map((day) => (
        <SectionCard key={day.dayNumber} title={`Day ${day.dayNumber}`} hint={day.theme[locale]}>
          {day.stops.map((stop) => (
            <StopCard
              key={stop.id}
              stop={stop}
              locale={locale}
              onDirections={() =>
                openNavigationLink(
                  stop.transitFromPrevious?.navigationLinks.naverMap ??
                    `https://maps.google.com/?q=${stop.place.coordinates.latitude},${stop.place.coordinates.longitude}`
                )
              }
              onBooking={() =>
                stop.place.bookingUrl ? openNavigationLink(stop.place.bookingUrl) : undefined
              }
            />
          ))}
        </SectionCard>
      ))}

      {/* ── 가격 디버그 (개발자용) ── */}
      <SectionCard
        title={locale === "ko" ? "가격 디버그" : "Price debug"}
        hint={
          locale === "ko"
            ? "총액 계산과 장소별·이동별 비용을 확인할 수 있어요."
            : "Inspect total cost, stop spend, and transit fares."
        }
      >
        <Text style={styles.debugSummary}>
          {locale === "ko"
            ? `총 ${formatKrwFull(itinerary.planningMeta.budgetSummary.estimatedTotalKrw, locale)} / 잔여 ${formatKrwFull(itinerary.planningMeta.budgetSummary.remainingBudgetKrw, locale)}`
            : `Total ${formatKrwFull(itinerary.planningMeta.budgetSummary.estimatedTotalKrw, locale)} / Remaining ${formatKrwFull(itinerary.planningMeta.budgetSummary.remainingBudgetKrw, locale)}`}
        </Text>
        <Text style={styles.debugMeta}>
          {locale === "ko"
            ? `장소 ${formatKrwFull(placeSpendTotalKrw, locale)} / 이동 ${formatKrwFull(transitSpendTotalKrw, locale)} / ${itinerary.preferences.partySize}명`
            : `Place ${formatKrwFull(placeSpendTotalKrw, locale)} / Transit ${formatKrwFull(transitSpendTotalKrw, locale)} / ${itinerary.preferences.partySize} pax`}
        </Text>
        {itinerary.days.map((day) => (
          <View key={`price-${day.dayNumber}`} style={styles.debugDay}>
            <Text style={styles.debugDayTitle}>{`Day ${day.dayNumber}`}</Text>
            {day.stops.map((stop) => (
              <View key={`price-stop-${stop.id}`} style={styles.debugRow}>
                <Text style={styles.debugPlaceName}>
                  {stop.order}. {stop.place.name[locale]}
                </Text>
                <Text style={styles.debugMeta}>
                  {locale === "ko"
                    ? `장소 ${formatKrwFull(stop.place.estimatedSpendKrw * itinerary.preferences.partySize, locale)} (${formatKrwFull(stop.place.estimatedSpendKrw, locale)} × ${itinerary.preferences.partySize})`
                    : `Place ${formatKrwFull(stop.place.estimatedSpendKrw * itinerary.preferences.partySize, locale)} (${formatKrwFull(stop.place.estimatedSpendKrw, locale)} × ${itinerary.preferences.partySize})`}
                </Text>
                {stop.transitFromPrevious ? (
                  <Text style={styles.debugTransit}>
                    {locale === "ko"
                      ? `이동 ${formatKrwFull(stop.transitFromPrevious.estimatedFareKrw * itinerary.preferences.partySize, locale)} (${stop.transitFromPrevious.provider})`
                      : `Transit ${formatKrwFull(stop.transitFromPrevious.estimatedFareKrw * itinerary.preferences.partySize, locale)} (${stop.transitFromPrevious.provider})`}
                  </Text>
                ) : null}
              </View>
            ))}
          </View>
        ))}
      </SectionCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  budgetLabel: {
    color: colors.sand,
    fontSize: 16,
    fontWeight: "800",
    lineHeight: 24,
  },
  metaStack: {
    gap: 7,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  metaCopy: {
    color: "rgba(248,251,253,0.72)",
    fontSize: 13,
    lineHeight: 19,
    flex: 1,
  },
  actionGroup: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  primaryBtn: {
    flex: 1,
    backgroundColor: colors.coral,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  primaryBtnText: {
    color: colors.navy,
    fontWeight: "800",
    fontSize: 14,
  },
  secondaryBtn: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.line,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  secondaryBtnText: {
    color: colors.cloud,
    fontWeight: "700",
    fontSize: 14,
  },
  inlineGroup: {
    flexDirection: "row",
    gap: spacing.sm,
    flexWrap: "wrap",
  },
  inlineBtn: {
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  inlineBtnText: {
    color: colors.cloud,
    fontSize: 13,
    fontWeight: "600",
  },
  debugSummary: {
    color: colors.sand,
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 20,
  },
  debugDay: {
    gap: 6,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  debugDayTitle: {
    color: colors.cloud,
    fontSize: 12,
    fontWeight: "800",
  },
  debugRow: {
    gap: 3,
    paddingBottom: spacing.xs,
  },
  debugPlaceName: {
    color: "rgba(248,251,253,0.80)",
    fontSize: 12,
    fontWeight: "700",
  },
  debugMeta: {
    color: "rgba(248,251,253,0.58)",
    fontSize: 11,
    lineHeight: 16,
  },
  debugTransit: {
    color: colors.mint,
    fontSize: 11,
    lineHeight: 16,
  },
});
