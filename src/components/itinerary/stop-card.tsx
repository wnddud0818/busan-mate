import { Feather } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { radii, spacing } from "../../theme/tokens";
import { useColors } from "../../theme/use-colors";
import { ItineraryStop } from "../../types/domain";
import { tText } from "../../utils/localized";
import { clockLabel } from "../../utils/time";

export const StopCard = ({
  stop,
  locale,
  onOpenGoogleMaps,
  onOpenNaverMap,
  onBooking,
}: {
  stop: ItineraryStop;
  locale: "ko" | "en";
  onOpenGoogleMaps: () => void;
  onOpenNaverMap: () => void;
  onBooking?: () => void;
}) => {
  const colors = useColors();

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

        {stop.transitFromPrevious ? (
          <View style={styles.transitRow}>
            <Feather name="navigation" size={11} color={colors.coral} />
            <Text style={[styles.transit, { color: colors.coral }]}>
              {tText(stop.transitFromPrevious.summary, locale)}
            </Text>
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
                {locale === "ko" ? "예약" : "Booking"}
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
