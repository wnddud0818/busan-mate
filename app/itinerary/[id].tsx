import { useMutation } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";

import { GuestUpgradeCard } from "../../src/components/common/guest-upgrade-card";
import { Screen } from "../../src/components/common/screen";
import { SectionCard } from "../../src/components/common/section-card";
import { StopCard } from "../../src/components/itinerary/stop-card";
import { sendMagicLink } from "../../src/services/auth-service";
import { openNavigationLink, requestLiveGuidePermissions, saveTrackingState } from "../../src/services/location-service";
import { publishItinerary } from "../../src/services/publish-service";
import { useAppStore } from "../../src/stores/app-store";
import { colors, radii, spacing } from "../../src/theme/tokens";

export default function ItineraryDetailPage() {
  const params = useLocalSearchParams<{ id: string }>();
  const locale = useAppStore((state) => state.locale);
  const itinerary = useAppStore((state) => state.itineraries.find((item) => item.id === params.id));
  const profile = useAppStore((state) => state.userProfile);
  const { startSession, setUserProfile, publishItineraryLocally, applyRating, setLocationConsent } =
    useAppStore((state) => state.actions);
  const { t } = useTranslation();

  const publishMutation = useMutation({
    mutationFn: async () => {
      if (!itinerary) {
        throw new Error("Missing itinerary");
      }

      return publishItinerary({
        itinerary,
        userProfile: profile,
      });
    },
    onSuccess: ({ upgradeRequired }) => {
      if (!itinerary) {
        return;
      }

      if (!upgradeRequired) {
        publishItineraryLocally(itinerary.id);
      } else {
        Alert.alert(
          locale === "ko" ? "로그인 업그레이드 필요" : "Upgrade required",
          locale === "ko" ? "이메일 링크로 로그인하면 공유할 수 있어요." : "Use a magic link before publishing."
        );
      }
    },
  });

  if (!itinerary) {
    return (
      <Screen title="Busan Mate">
        <Text style={{ color: "white" }}>Missing itinerary.</Text>
      </Screen>
    );
  }

  const startLiveGuide = async () => {
    const session = startSession(itinerary);
    const permissionGranted = await requestLiveGuidePermissions();
    setLocationConsent(permissionGranted);
    await saveTrackingState(itinerary, {
      ...session,
      locationConsent: permissionGranted,
    });
    router.push(`/trip/${session.id}`);
  };

  return (
    <Screen title={itinerary.title[locale]} subtitle={itinerary.summary[locale]}>
      <SectionCard>
        <Text style={styles.metric}>{itinerary.estimatedBudgetLabel[locale]}</Text>
        <View style={styles.actionRow}>
          <Pressable style={styles.primaryButton} onPress={startLiveGuide}>
            <Text style={styles.primaryButtonText}>{t("itinerary.startGuide")}</Text>
          </Pressable>
          <Pressable style={styles.secondaryButton} onPress={() => publishMutation.mutate()}>
            <Text style={styles.secondaryButtonText}>
              {itinerary.shareStatus === "published" ? t("itinerary.published") : t("itinerary.publish")}
            </Text>
          </Pressable>
        </View>
        <View style={styles.actionRow}>
          <Pressable
            style={styles.inlineButton}
            onPress={() => {
              const session = startSession(itinerary);
              router.push(`/trip/${session.id}/guide`);
            }}
          >
            <Text style={styles.inlineButtonText}>{t("itinerary.askGuide")}</Text>
          </Pressable>
          <Pressable style={styles.inlineButton} onPress={() => applyRating(itinerary.id, 5)}>
            <Text style={styles.inlineButtonText}>{locale === "ko" ? "5점 남기기" : "Rate 5.0"}</Text>
          </Pressable>
        </View>
      </SectionCard>

      {profile?.isAnonymous ? (
        <GuestUpgradeCard
          locale={locale}
          onSend={async (email) => {
            const upgraded = await sendMagicLink(email);
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
              onBooking={() => (stop.place.bookingUrl ? openNavigationLink(stop.place.bookingUrl) : undefined)}
            />
          ))}
        </SectionCard>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  metric: {
    color: colors.sand,
    fontSize: 16,
    fontWeight: "800",
  },
  actionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  primaryButton: {
    flex: 1,
    minWidth: 160,
    backgroundColor: colors.coral,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    alignItems: "center",
  },
  primaryButtonText: {
    color: colors.navy,
    fontWeight: "800",
  },
  secondaryButton: {
    flex: 1,
    minWidth: 160,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: "center",
  },
  secondaryButtonText: {
    color: colors.cloud,
    fontWeight: "800",
  },
  inlineButton: {
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  inlineButtonText: {
    color: colors.cloud,
    fontWeight: "700",
  },
});
