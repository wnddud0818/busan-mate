import { Feather } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { radii, spacing } from "../../theme/tokens";
import { useColors } from "../../theme/use-colors";
import { CrowdForecastLevel, ItineraryStop, RouteStep, StopCrowdForecast } from "../../types/domain";
import { formatKrwFull } from "../../utils/currency";
import { tText } from "../../utils/localized";
import { clockLabel } from "../../utils/time";

const formatTransitDuration = (minutes: number, locale: "ko" | "en") =>
  locale === "ko" ? `${minutes}\uBD84` : `${minutes} min`;

const formatTransitDistance = (distanceKm: number, locale: "ko" | "en") => {
  const normalized = Number.isInteger(distanceKm) ? distanceKm.toFixed(0) : distanceKm.toFixed(1);
  return locale === "ko" ? `${normalized}km` : `${normalized} km`;
};

const transitModeLabel = (mode: RouteStep["mode"], locale: "ko" | "en") => {
  switch (mode) {
    case "walk":
      return locale === "ko" ? "\uB3C4\uBCF4" : "Walk";
    case "bus":
      return locale === "ko" ? "\uBC84\uC2A4" : "Bus";
    case "metro":
      return locale === "ko" ? "\uC9C0\uD558\uCCA0" : "Metro";
    case "taxi":
      return locale === "ko" ? "\uD0DD\uC2DC" : "Taxi";
    default:
      return locale === "ko" ? "\uC774\uB3D9" : "Transit";
  }
};

const crowdLevelLabel = (level: CrowdForecastLevel, locale: "ko" | "en") => {
  switch (level) {
    case "low":
      return locale === "ko" ? "\uD63C\uC7A1 \uB0AE\uC74C" : "Low crowd";
    case "high":
      return locale === "ko" ? "\uD63C\uC7A1 \uB192\uC74C" : "High crowd";
    default:
      return locale === "ko" ? "\uD63C\uC7A1 \uBCF4\uD1B5" : "Moderate crowd";
  }
};

const crowdTone = (level: CrowdForecastLevel, colors: ReturnType<typeof useColors>) => {
  switch (level) {
    case "low":
      return {
        backgroundColor: colors.mintLight,
        borderColor: colors.mintBorder,
        accent: colors.mint,
      };
    case "high":
      return {
        backgroundColor: colors.coralLight,
        borderColor: colors.coralBorder,
        accent: colors.coral,
      };
    default:
      return {
        backgroundColor: colors.sandLight,
        borderColor: colors.lineBright,
        accent: colors.sand,
      };
  }
};

export const StopCard = ({
  stop,
  crowdForecast,
  locale,
  onOpenGoogleMaps,
  onOpenNaverMap,
  onBooking,
}: {
  stop: ItineraryStop;
  crowdForecast?: StopCrowdForecast | null;
  locale: "ko" | "en";
  onOpenGoogleMaps: () => void;
  onOpenNaverMap: () => void;
  onBooking?: () => void;
}) => {
  const colors = useColors();
  const crowdStyles = crowdForecast ? crowdTone(crowdForecast.level, colors) : null;

  return (
    <View style={styles.container}>
      <View style={styles.orderColumn}>
        <View style={[styles.orderBadge, { backgroundColor: colors.surfaceHigh, borderColor: colors.lineBright }]}>
          <Text style={[styles.orderText, { color: colors.cloud }]}>{stop.order}</Text>
        </View>
      </View>

      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }]}>
        <View style={styles.timeRow}>
          <Feather name="clock" size={11} color={colors.mint} />
          <Text style={[styles.time, { color: colors.mint }]}>
            {clockLabel(stop.startTime)} - {clockLabel(stop.endTime)}
          </Text>
        </View>

        <Text style={[styles.title, { color: colors.cloud }]}>{tText(stop.place.name, locale)}</Text>

        {stop.highlight ? (
          <Text style={[styles.highlight, { color: colors.sand }]}>{tText(stop.highlight, locale)}</Text>
        ) : null}

        <Text style={[styles.description, { color: colors.mist }]}>{tText(stop.place.description, locale)}</Text>

        {crowdForecast ? (
          <View
            style={[
              styles.crowdCard,
              {
                backgroundColor: crowdStyles?.backgroundColor,
                borderColor: crowdStyles?.borderColor,
              },
            ]}
          >
            <View style={styles.crowdHeader}>
              <View style={styles.crowdHeaderLabel}>
                <Feather name="users" size={12} color={crowdStyles?.accent} />
                <Text style={[styles.crowdTitle, { color: crowdStyles?.accent }]}>
                  {crowdLevelLabel(crowdForecast.level, locale)}
                </Text>
              </View>
              <Text style={[styles.crowdScore, { color: crowdStyles?.accent }]}>
                {crowdForecast.rate.toFixed(1)}/100
              </Text>
            </View>
            <Text style={[styles.crowdDetail, { color: colors.mist }]}>
              {locale === "ko"
                ? `${crowdForecast.matchedAttractionName} \uAE30\uC900 \uC608\uCE21`
                : `Matched with ${crowdForecast.matchedAttractionName}`}
            </Text>
          </View>
        ) : crowdForecast === null ? (
          <View style={[styles.crowdCard, { backgroundColor: colors.glass, borderColor: colors.line }]}>
            <View style={styles.crowdHeaderLabel}>
              <Feather name="users" size={12} color={colors.mist} />
              <Text style={[styles.crowdFallbackText, { color: colors.mist }]}>
                {locale === "ko" ? "\uD63C\uC7A1 \uC608\uCE21 \uC815\uBCF4 \uC5C6\uC74C" : "No crowd forecast"}
              </Text>
            </View>
          </View>
        ) : null}

        {stop.transitFromPrevious ? (
          <View style={styles.transitBlock}>
            <View style={styles.transitRow}>
              <Feather name="navigation" size={11} color={colors.coral} />
              <Text style={[styles.transit, { color: colors.coral }]}>
                {tText(stop.transitFromPrevious.summary, locale)}
              </Text>
            </View>

            <View style={styles.transitMetaRow}>
              <View style={[styles.transitChip, { backgroundColor: colors.surfaceHigh, borderColor: colors.line }]}>
                <Text style={[styles.transitChipText, { color: colors.cloud }]}>
                  {formatTransitDuration(stop.transitFromPrevious.durationMinutes, locale)}
                </Text>
              </View>
              <View style={[styles.transitChip, { backgroundColor: colors.surfaceHigh, borderColor: colors.line }]}>
                <Text style={[styles.transitChipText, { color: colors.cloud }]}>
                  {formatTransitDistance(stop.transitFromPrevious.distanceKm, locale)}
                </Text>
              </View>
              <View style={[styles.transitChip, { backgroundColor: colors.surfaceHigh, borderColor: colors.line }]}>
                <Text style={[styles.transitChipText, { color: colors.cloud }]}>
                  {formatKrwFull(stop.transitFromPrevious.estimatedFareKrw, locale)}
                </Text>
              </View>
            </View>

            {stop.transitFromPrevious.steps.length > 0 ? (
              <View style={styles.transitSteps}>
                {stop.transitFromPrevious.steps.map((step, index) => (
                  <View
                    key={`${stop.id}-step-${index}-${step.mode}`}
                    style={[styles.transitStepRow, { borderColor: colors.line }]}
                  >
                    <View
                      style={[styles.transitStepBadge, { backgroundColor: colors.glass, borderColor: colors.line }]}
                    >
                      <Text style={[styles.transitStepBadgeText, { color: colors.cloud }]}>
                        {transitModeLabel(step.mode, locale)}
                      </Text>
                    </View>
                    <View style={styles.transitStepCopy}>
                      <Text style={[styles.transitStepTitle, { color: colors.cloud }]}>
                        {tText(step.label, locale)}
                      </Text>
                      {step.detail ? (
                        <Text style={[styles.transitStepDetail, { color: colors.mist }]}>
                          {tText(step.detail, locale)}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                ))}
              </View>
            ) : null}
          </View>
        ) : null}

        {stop.note ? <Text style={[styles.note, { color: colors.mist }]}>{tText(stop.note, locale)}</Text> : null}

        <View style={styles.actions}>
          <Pressable onPress={onOpenGoogleMaps} style={[styles.primaryAction, { backgroundColor: colors.coral }]}>
            <Feather name="map-pin" size={12} color={colors.navy} />
            <Text style={[styles.primaryActionText, { color: colors.navy }]}>Google Maps</Text>
          </Pressable>
          <Pressable
            onPress={onOpenNaverMap}
            style={[styles.secondaryAction, { backgroundColor: colors.glass, borderColor: colors.line }]}
          >
            <Feather name="navigation" size={12} color={colors.cloud} />
            <Text style={[styles.secondaryActionText, { color: colors.cloud }]}>Naver Map</Text>
          </Pressable>
          {stop.place.bookingUrl ? (
            <Pressable
              onPress={onBooking}
              style={[styles.secondaryAction, { backgroundColor: colors.glass, borderColor: colors.line }]}
            >
              <Feather name="external-link" size={12} color={colors.cloud} />
              <Text style={[styles.secondaryActionText, { color: colors.cloud }]}>
                {locale === "ko" ? "\uC608\uC57D" : "Booking"}
              </Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  orderColumn: {
    alignItems: "center",
    paddingTop: 14,
    width: 28,
  },
  orderBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  orderText: {
    fontSize: 11,
    fontWeight: "800",
  },
  card: {
    flex: 1,
    borderRadius: radii.md,
    borderWidth: 1,
    padding: spacing.md,
    gap: 8,
    marginBottom: spacing.xs,
  },
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  time: {
    fontSize: 12,
    fontWeight: "700",
  },
  title: {
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: -0.2,
  },
  highlight: {
    fontSize: 12,
    fontWeight: "700",
  },
  description: {
    fontSize: 13,
    lineHeight: 20,
  },
  crowdCard: {
    borderWidth: 1,
    borderRadius: radii.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    gap: 4,
  },
  crowdHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.sm,
  },
  crowdHeaderLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
  },
  crowdTitle: {
    fontSize: 12,
    fontWeight: "800",
  },
  crowdScore: {
    fontSize: 12,
    fontWeight: "800",
  },
  crowdDetail: {
    fontSize: 11,
    lineHeight: 16,
  },
  crowdFallbackText: {
    fontSize: 11,
    fontWeight: "700",
  },
  transitBlock: {
    gap: 8,
  },
  transitRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  transit: {
    fontSize: 12,
    fontWeight: "600",
    flex: 1,
  },
  transitMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  transitChip: {
    borderWidth: 1,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  transitChipText: {
    fontSize: 11,
    fontWeight: "700",
  },
  transitSteps: {
    gap: 6,
  },
  transitStepRow: {
    flexDirection: "row",
    gap: 8,
    borderTopWidth: 1,
    paddingTop: 8,
  },
  transitStepBadge: {
    borderWidth: 1,
    borderRadius: radii.pill,
    alignSelf: "flex-start",
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  transitStepBadgeText: {
    fontSize: 10,
    fontWeight: "800",
  },
  transitStepCopy: {
    flex: 1,
    gap: 2,
  },
  transitStepTitle: {
    fontSize: 12,
    fontWeight: "700",
  },
  transitStepDetail: {
    fontSize: 11,
    lineHeight: 16,
  },
  note: {
    fontSize: 12,
    lineHeight: 18,
  },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: 2,
  },
  primaryAction: {
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  primaryActionText: {
    fontSize: 13,
    fontWeight: "700",
  },
  secondaryAction: {
    borderWidth: 1,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  secondaryActionText: {
    fontSize: 13,
    fontWeight: "700",
  },
});
