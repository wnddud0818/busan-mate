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
      if (!itinerary) {
        throw new Error("Missing itinerary");
      }

      return publishItinerary({
        itinerary,
        userProfile: profile,
      });
    },
    onSuccess: (result) => {
      if (result.upgradeRequired) {
        Alert.alert(
          locale === "ko" ? "濡쒓렇???낃렇?덉씠???꾩슂" : "Upgrade required",
          locale === "ko" ? "?대찓??留곹겕濡?濡쒓렇?명븯硫?怨듭쑀?????덉뼱??" : "Use a magic link before publishing."
        );
        return;
      }

      upsertItinerary(result.itinerary);
      upsertSharedItinerary(result.shared);

      if (result.syncStatus === "pending") {
        Alert.alert(
          "Busan Mate",
          locale === "ko"
            ? "원격 저장에 실패해 로컬 임시 상태로 보관했어요."
            : "Remote sync failed, so this route is saved locally for now."
        );
      }
    },
  });

  const ratingMutation = useMutation({
    mutationFn: async () => {
      if (!itinerary) {
        throw new Error("Missing itinerary");
      }

      return rateItinerary({
        itinerary,
        rating: 5,
        userProfile: profile,
      });
    },
    onSuccess: (result) => {
      upsertItinerary(result.itinerary);
      if (result.shared) {
        upsertSharedItinerary(result.shared);
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

  const launchSession = async ({
    askPermission,
    destination,
  }: {
    askPermission: boolean;
    destination: "guide" | "live";
  }) => {
    const draftSession = startSession(itinerary);
    const permissionGranted = askPermission ? await requestLiveGuidePermissions() : false;
    const nextSession = {
      ...draftSession,
      locationConsent: permissionGranted,
    };

    setLocationConsent(permissionGranted);
    const result = await syncLiveSession({
      itinerary,
      session: nextSession,
      userProfile: profile,
    });

    upsertItinerary(result.itinerary);
    updateSession(result.session);
    await saveTrackingState(result.itinerary, result.session);

    router.push(destination === "live" ? `/trip/${result.session.id}` : `/trip/${result.session.id}/guide`);
  };

  return (
    <Screen title={itinerary.title[locale]} subtitle={itinerary.summary[locale]}>
      <SectionCard>
        <Text style={styles.metric}>{itinerary.estimatedBudgetLabel[locale]}</Text>
        <View style={styles.actionRow}>
          <Pressable style={styles.primaryButton} onPress={() => launchSession({ askPermission: true, destination: "live" })}>
            <Text style={styles.primaryButtonText}>{t("itinerary.startGuide")}</Text>
          </Pressable>
          <Pressable style={styles.secondaryButton} onPress={() => publishMutation.mutate()}>
            <Text style={styles.secondaryButtonText}>
              {itinerary.shareStatus === "published" ? t("itinerary.published") : t("itinerary.publish")}
            </Text>
          </Pressable>
        </View>
        <View style={styles.actionRow}>
          <Pressable style={styles.inlineButton} onPress={() => launchSession({ askPermission: false, destination: "guide" })}>
            <Text style={styles.inlineButtonText}>{t("itinerary.askGuide")}</Text>
          </Pressable>
          <Pressable style={styles.inlineButton} onPress={() => ratingMutation.mutate()}>
            <Text style={styles.inlineButtonText}>{locale === "ko" ? "5점 남기기" : "Rate 5.0"}</Text>
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
