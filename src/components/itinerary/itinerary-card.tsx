import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, radii, spacing } from "../../theme/tokens";
import { Itinerary } from "../../types/domain";
import { formatKrwCompact } from "../../utils/currency";
import { tText } from "../../utils/localized";

export const ItineraryCard = ({
  itinerary,
  locale,
  onPress,
}: {
  itinerary: Itinerary;
  locale: "ko" | "en";
  onPress: () => void;
}) => (
  <Pressable onPress={onPress} style={styles.card}>
    <View style={styles.metaRow}>
      <Text style={styles.badge}>{itinerary.shareStatus === "published" ? "Published" : "Private"}</Text>
      <Text style={styles.score}>★ {itinerary.ratingAverage.toFixed(1)}</Text>
    </View>
    <Text style={styles.title}>{tText(itinerary.title, locale)}</Text>
    <Text style={styles.summary}>{tText(itinerary.summary, locale)}</Text>
    <Text style={styles.meta}>
      {tText(itinerary.planningMeta?.budgetSummary.summary ?? itinerary.estimatedBudgetLabel, locale)}
    </Text>
    <Text style={styles.meta}>{tText(itinerary.planningMeta?.weatherSnapshot.summary ?? itinerary.summary, locale)}</Text>
    <Text style={styles.footer}>
      {itinerary.days.length} days ·{" "}
      {itinerary.planningMeta
        ? formatKrwCompact(itinerary.planningMeta.budgetSummary.estimatedTotalKrw, locale)
        : tText(itinerary.estimatedBudgetLabel, locale)}
    </Text>
  </Pressable>
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: radii.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.line,
    gap: spacing.sm,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  badge: {
    color: colors.mint,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  score: {
    color: colors.sand,
    fontSize: 12,
    fontWeight: "700",
  },
  title: {
    color: colors.cloud,
    fontSize: 18,
    fontWeight: "800",
  },
  summary: {
    color: "rgba(248,251,253,0.74)",
    fontSize: 13,
    lineHeight: 19,
  },
  meta: {
    color: "rgba(248,251,253,0.68)",
    fontSize: 12,
    lineHeight: 18,
  },
  footer: {
    color: "rgba(248,251,253,0.58)",
    fontSize: 12,
  },
});
