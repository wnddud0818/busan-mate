import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, radii, spacing } from "../../theme/tokens";
import { ItineraryStop } from "../../types/domain";
import { tText } from "../../utils/localized";
import { clockLabel } from "../../utils/time";

export const StopCard = ({
  stop,
  locale,
  onDirections,
  onBooking,
}: {
  stop: ItineraryStop;
  locale: "ko" | "en";
  onDirections: () => void;
  onBooking?: () => void;
}) => (
  <View style={styles.card}>
    <View style={styles.topRow}>
      <View>
        <Text style={styles.time}>
          {clockLabel(stop.startTime)} - {clockLabel(stop.endTime)}
        </Text>
        <Text style={styles.title}>{tText(stop.place.name, locale)}</Text>
      </View>
      <Text style={styles.highlight}>{tText(stop.highlight, locale)}</Text>
    </View>

    <Text style={styles.description}>{tText(stop.place.description, locale)}</Text>
    {stop.transitFromPrevious ? (
      <Text style={styles.transit}>{tText(stop.transitFromPrevious.summary, locale)}</Text>
    ) : null}
    <Text style={styles.note}>{tText(stop.note, locale)}</Text>

    <View style={styles.actions}>
      <Pressable onPress={onDirections} style={styles.actionButton}>
        <Text style={styles.actionText}>{locale === "ko" ? "길안내" : "Directions"}</Text>
      </Pressable>
      {stop.place.bookingUrl ? (
        <Pressable onPress={onBooking} style={[styles.actionButton, styles.secondaryButton]}>
          <Text style={styles.secondaryText}>{locale === "ko" ? "예약 링크" : "Booking"}</Text>
        </Pressable>
      ) : null}
    </View>
  </View>
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.md,
    gap: spacing.sm,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  time: {
    color: colors.mint,
    fontWeight: "700",
    fontSize: 12,
  },
  title: {
    color: colors.cloud,
    fontSize: 17,
    fontWeight: "700",
  },
  highlight: {
    color: colors.sand,
    fontSize: 12,
    fontWeight: "700",
  },
  description: {
    color: "rgba(248,251,253,0.78)",
    fontSize: 13,
    lineHeight: 20,
  },
  transit: {
    color: colors.coral,
    fontSize: 12,
    fontWeight: "600",
  },
  note: {
    color: "rgba(248,251,253,0.62)",
    fontSize: 12,
    lineHeight: 18,
  },
  actions: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  actionButton: {
    backgroundColor: colors.coral,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  secondaryButton: {
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  actionText: {
    color: colors.navy,
    fontSize: 13,
    fontWeight: "700",
  },
  secondaryText: {
    color: colors.cloud,
    fontSize: 13,
    fontWeight: "700",
  },
});
