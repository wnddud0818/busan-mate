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
}) => {
  const isPublished = itinerary.shareStatus === "published";

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      {/* 상태 표시 accent bar */}
      <View style={[styles.accentBar, { backgroundColor: isPublished ? colors.mint : colors.lineBright }]} />

      <View style={styles.inner}>
        {/* 상단 메타 행 */}
        <View style={styles.metaRow}>
          <View
            style={[
              styles.badge,
              isPublished ? styles.badgePublished : styles.badgePrivate,
            ]}
          >
            <Text
              style={[
                styles.badgeText,
                isPublished ? styles.badgeTextPublished : styles.badgeTextPrivate,
              ]}
            >
              {isPublished
                ? locale === "ko" ? "공개" : "Public"
                : locale === "ko" ? "비공개" : "Private"}
            </Text>
          </View>
          <View style={styles.ratingRow}>
            <Text style={styles.star}>★</Text>
            <Text style={styles.score}>{itinerary.ratingAverage.toFixed(1)}</Text>
          </View>
        </View>

        {/* 제목 */}
        <Text style={styles.title}>{tText(itinerary.title, locale)}</Text>

        {/* 요약 */}
        <Text style={styles.summary} numberOfLines={2}>
          {tText(itinerary.summary, locale)}
        </Text>

        {/* 날씨·예산 요약 */}
        {itinerary.planningMeta ? (
          <Text style={styles.meta} numberOfLines={1}>
            {tText(itinerary.planningMeta.weatherSnapshot.summary, locale)}
          </Text>
        ) : null}

        {/* 하단 정보 */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            {itinerary.days.length}
            {locale === "ko" ? "일" : " days"}
          </Text>
          <Text style={styles.footerDot}>·</Text>
          <Text style={styles.footerText}>
            {itinerary.planningMeta
              ? formatKrwCompact(
                  itinerary.planningMeta.budgetSummary.estimatedTotalKrw,
                  locale
                )
              : tText(itinerary.estimatedBudgetLabel, locale)}
          </Text>
        </View>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.line,
    flexDirection: "row",
    overflow: "hidden",
  },
  pressed: {
    opacity: 0.78,
    backgroundColor: "rgba(255,255,255,0.10)",
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
  badgePublished: {
    backgroundColor: colors.mintLight,
    borderColor: colors.mintBorder,
  },
  badgePrivate: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderColor: colors.line,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  badgeTextPublished: {
    color: colors.mint,
  },
  badgeTextPrivate: {
    color: colors.mist,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  star: {
    color: colors.sand,
    fontSize: 12,
  },
  score: {
    color: colors.sand,
    fontSize: 13,
    fontWeight: "700",
  },
  title: {
    color: colors.cloud,
    fontSize: 17,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  summary: {
    color: colors.mist,
    fontSize: 13,
    lineHeight: 19,
  },
  meta: {
    color: colors.fog,
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
    color: colors.fog,
    fontSize: 12,
    fontWeight: "600",
  },
  footerDot: {
    color: colors.fog,
    fontSize: 12,
  },
});
