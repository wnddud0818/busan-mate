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
import { radii, spacing } from "../../src/theme/tokens";
import { useColors } from "../../src/theme/use-colors";
import { formatKrwCompact, formatKrwFull } from "../../src/utils/currency";

export default function ItineraryDetailPage() {
  const params = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const locale = useAppStore((state) => state.locale);
  const itinerary = useAppStore((state) => state.itineraries.find((item) => item.id === params.id));
  const profile = useAppStore((state) => state.userProfile);
  const {
    startSession, updateSession, setUserProfile,
    upsertItinerary, upsertSharedItinerary, setLocationConsent,
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
      total + day.stops.reduce((dayTotal, stop) => dayTotal + stop.place.estimatedSpendKrw * itinerary.preferences.partySize, 0),
    0
  );
  const transitSpendTotalKrw = itinerary.days.reduce(
    (total, day) =>
      total + day.stops.reduce(
        (dayTotal, stop) => dayTotal + (stop.transitFromPrevious?.estimatedFareKrw ?? 0) * itinerary.preferences.partySize,
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
    router.push(destination === "live" ? `/trip/${result.session.id}` : `/trip/${result.session.id}/guide`);
  };

  const isPublished = itinerary.shareStatus === "published";

  return (
    <Screen title={itinerary.title[locale]} subtitle={itinerary.summary[locale]} showBack>
      {/* ── 예산·날씨 요약 ── */}
      <SectionCard>
        <Text style={[styles.budgetLabel, { color: colors.sand }]}>
          {itinerary.planningMeta
            ? itinerary.planningMeta.budgetSummary.summary[locale]
            : itinerary.estimatedBudgetLabel[locale]}
        </Text>
        {itinerary.planningMeta ? (
          <View style={styles.metaStack}>
            {[
              { icon: "dollar-sign" as const, text: locale === "ko"
                ? `총 ${formatKrwFull(itinerary.planningMeta.budgetSummary.estimatedTotalKrw, locale)} / 1인 ${formatKrwCompact(itinerary.planningMeta.budgetSummary.estimatedPerPersonKrw, locale)}`
                : `Total ${formatKrwFull(itinerary.planningMeta.budgetSummary.estimatedTotalKrw, locale)} / ${formatKrwCompact(itinerary.planningMeta.budgetSummary.estimatedPerPersonKrw, locale)} per person` },
              { icon: "cloud" as const, text: itinerary.planningMeta.weatherSnapshot.summary[locale] },
              { icon: "map-pin" as const, text: locale === "ko"
                ? `${itinerary.planningMeta.startArea.name.ko} 출발`
                : `Starting near ${itinerary.planningMeta.startArea.name.en}` },
            ].map(({ icon, text }) => (
              <View key={icon} style={styles.metaRow}>
                <Feather name={icon} size={13} color={colors.mint} />
                <Text style={[styles.metaCopy, { color: colors.mist }]}>{text}</Text>
              </View>
            ))}
          </View>
        ) : null}

        <View style={styles.actionGroup}>
          <Pressable
            style={[styles.primaryBtn, { backgroundColor: colors.coral }]}
            onPress={() => launchSession({ askPermission: true, destination: "live" })}
          >
            <Feather name="navigation" size={16} color={colors.navy} />
            <Text style={[styles.primaryBtnText, { color: colors.navy }]}>{t("itinerary.startGuide")}</Text>
          </Pressable>
          <Pressable
            style={[styles.secondaryBtn, { backgroundColor: colors.glass, borderColor: colors.line }]}
            onPress={() => publishMutation.mutate()}
          >
            <Feather name={isPublished ? "check-circle" : "share-2"} size={16} color={colors.cloud} />
            <Text style={[styles.secondaryBtnText, { color: colors.cloud }]}>
              {isPublished ? t("itinerary.published") : t("itinerary.publish")}
            </Text>
          </Pressable>
        </View>

        <View style={styles.inlineGroup}>
          <Pressable
            style={[styles.inlineBtn, { borderColor: colors.line, backgroundColor: colors.glass }]}
            onPress={() => launchSession({ askPermission: false, destination: "guide" })}
          >
            <Feather name="message-circle" size={13} color={colors.cloud} />
            <Text style={[styles.inlineBtnText, { color: colors.cloud }]}>{t("itinerary.askGuide")}</Text>
          </Pressable>
          <Pressable
            style={[styles.inlineBtn, { borderColor: colors.line, backgroundColor: colors.glass }]}
            onPress={() => ratingMutation.mutate()}
          >
            <Feather name="star" size={13} color={colors.sand} />
            <Text style={[styles.inlineBtnText, { color: colors.cloud }]}>
              {locale === "ko" ? "5점 남기기" : "Rate 5.0"}
            </Text>
          </Pressable>
        </View>
      </SectionCard>

      {profile?.isAnonymous ? (
        <GuestUpgradeCard
          locale={locale}
          onSend={async (email) => {
            const upgraded = await sendMagicLink(email, locale);
            setUserProfile(upgraded);
          }}
        />
      ) : null}

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

      <SectionCard
        title={locale === "ko" ? "가격 디버그" : "Price debug"}
        hint={locale === "ko"
          ? "총액 계산과 장소별·이동별 비용을 확인할 수 있어요."
          : "Inspect total cost, stop spend, and transit fares."}
      >
        <Text style={[styles.debugSummary, { color: colors.sand }]}>
          {locale === "ko"
            ? `총 ${formatKrwFull(itinerary.planningMeta.budgetSummary.estimatedTotalKrw, locale)} / 잔여 ${formatKrwFull(itinerary.planningMeta.budgetSummary.remainingBudgetKrw, locale)}`
            : `Total ${formatKrwFull(itinerary.planningMeta.budgetSummary.estimatedTotalKrw, locale)} / Remaining ${formatKrwFull(itinerary.planningMeta.budgetSummary.remainingBudgetKrw, locale)}`}
        </Text>
        <Text style={[styles.debugMeta, { color: colors.mist }]}>
          {locale === "ko"
            ? `장소 ${formatKrwFull(placeSpendTotalKrw, locale)} / 이동 ${formatKrwFull(transitSpendTotalKrw, locale)} / ${itinerary.preferences.partySize}명`
            : `Place ${formatKrwFull(placeSpendTotalKrw, locale)} / Transit ${formatKrwFull(transitSpendTotalKrw, locale)} / ${itinerary.preferences.partySize} pax`}
        </Text>
        {itinerary.days.map((day) => (
          <View key={`price-${day.dayNumber}`} style={[styles.debugDay, { borderTopColor: colors.line }]}>
            <Text style={[styles.debugDayTitle, { color: colors.cloud }]}>{`Day ${day.dayNumber}`}</Text>
            {day.stops.map((stop) => (
              <View key={`price-stop-${stop.id}`} style={styles.debugRow}>
                <Text style={[styles.debugPlaceName, { color: colors.smoke }]}>
                  {stop.order}. {stop.place.name[locale]}
                </Text>
                <Text style={[styles.debugMeta, { color: colors.mist }]}>
                  {locale === "ko"
                    ? `장소 ${formatKrwFull(stop.place.estimatedSpendKrw * itinerary.preferences.partySize, locale)} (${formatKrwFull(stop.place.estimatedSpendKrw, locale)} × ${itinerary.preferences.partySize})`
                    : `Place ${formatKrwFull(stop.place.estimatedSpendKrw * itinerary.preferences.partySize, locale)} (${formatKrwFull(stop.place.estimatedSpendKrw, locale)} × ${itinerary.preferences.partySize})`}
                </Text>
                {stop.transitFromPrevious ? (
                  <Text style={[styles.debugTransit, { color: colors.mint }]}>
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
  budgetLabel: { fontSize: 16, fontWeight: "800", lineHeight: 24 },
  metaStack: { gap: 7 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 7 },
  metaCopy: { fontSize: 13, lineHeight: 19, flex: 1 },
  actionGroup: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.xs },
  primaryBtn: {
    flex: 1, borderRadius: radii.md, paddingVertical: spacing.md,
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
  },
  primaryBtnText: { fontWeight: "800", fontSize: 14 },
  secondaryBtn: {
    flex: 1, borderRadius: radii.md, paddingVertical: spacing.md, borderWidth: 1,
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
  },
  secondaryBtnText: { fontWeight: "700", fontSize: 14 },
  inlineGroup: { flexDirection: "row", gap: spacing.sm, flexWrap: "wrap" },
  inlineBtn: {
    borderRadius: radii.pill, borderWidth: 1,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    flexDirection: "row", alignItems: "center", gap: 6,
  },
  inlineBtnText: { fontSize: 13, fontWeight: "600" },
  debugSummary: { fontSize: 13, fontWeight: "800", lineHeight: 20 },
  debugDay: { gap: 6, paddingTop: spacing.sm, borderTopWidth: 1 },
  debugDayTitle: { fontSize: 12, fontWeight: "800" },
  debugRow: { gap: 3, paddingBottom: spacing.xs },
  debugPlaceName: { fontSize: 12, fontWeight: "700" },
  debugMeta: { fontSize: 11, lineHeight: 16 },
  debugTransit: { fontSize: 11, lineHeight: 16 },
});
