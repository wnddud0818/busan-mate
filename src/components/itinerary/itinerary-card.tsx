import { Pressable, StyleSheet, Text, View } from "react-native";

import { radii, spacing } from "../../theme/tokens";
import { useColors } from "../../theme/use-colors";
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
}) => {
  const colors = useColors();
  const isPublished = itinerary.shareStatus === "published";

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.line },
        pressed && { opacity: 0.78, backgroundColor: colors.surfaceHigh },
      ]}
    >
      <View style={[styles.accentBar, { backgroundColor: isPublished ? colors.mint : colors.lineBright }]} />

      <View style={styles.inner}>
        <View style={styles.metaRow}>
          <View
            style={[
              styles.badge,
              isPublished
                ? { backgroundColor: colors.mintLight, borderColor: colors.mintBorder }
                : { backgroundColor: colors.glass, borderColor: colors.line },
            ]}
          >
            <Text
              style={[
                styles.badgeText,
                { color: isPublished ? colors.mint : colors.mist },
              ]}
            >
              {isPublished
                ? locale === "ko" ? "공개" : "Public"
                : locale === "ko" ? "비공개" : "Private"}
            </Text>
          </View>
          <View style={styles.ratingRow}>
            <Text style={[styles.star, { color: colors.sand }]}>★</Text>
            <Text style={[styles.score, { color: colors.sand }]}>{itinerary.ratingAverage.toFixed(1)}</Text>
          </View>
        </View>

        <Text style={[styles.title, { color: colors.cloud }]}>{tText(itinerary.title, locale)}</Text>

        <Text style={[styles.summary, { color: colors.mist }]} numberOfLines={2}>
          {tText(itinerary.summary, locale)}
        </Text>

        {itinerary.planningMeta ? (
          <Text style={[styles.meta, { color: colors.fog }]} numberOfLines={1}>
            {tText(itinerary.planningMeta.weatherSnapshot.summary, locale)}
          </Text>
        ) : null}

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.fog }]}>
            {itinerary.days.length}{locale === "ko" ? "일" : " days"}
          </Text>
          <Text style={[styles.footerDot, { color: colors.fog }]}>·</Text>
          <Text style={[styles.footerText, { color: colors.fog }]}>
            {itinerary.planningMeta
              ? formatKrwCompact(itinerary.planningMeta.budgetSummary.estimatedTotalKrw, locale)
              : tText(itinerary.estimatedBudgetLabel, locale)}
          </Text>
        </View>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.lg,
    borderWidth: 1,
    flexDirection: "row",
    overflow: "hidden",
  },
  accentBar: {
    width: 4,
  },
  inner: {
    flex: 1,
    padding: spacing.md,
    gap: 7,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  badge: {
    borderRadius: radii.pill,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  star: {
    fontSize: 12,
  },
  score: {
    fontSize: 13,
    fontWeight: "700",
  },
  title: {
    fontSize: 17,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  summary: {
    fontSize: 13,
    lineHeight: 19,
  },
  meta: {
    fontSize: 12,
    lineHeight: 18,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 2,
  },
  footerText: {
    fontSize: 12,
    fontWeight: "600",
  },
  footerDot: {
    fontSize: 12,
  },
});
