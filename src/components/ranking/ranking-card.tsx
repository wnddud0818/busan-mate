import { StyleSheet, Text, View } from "react-native";

import { colors, radii, spacing } from "../../theme/tokens";
import { RankingSnapshot } from "../../types/domain";
import { tText } from "../../utils/localized";

export const RankingCard = ({
  item,
  locale,
  rank,
}: {
  item: RankingSnapshot;
  locale: "ko" | "en";
  rank: number;
}) => (
  <View style={styles.card}>
    <View style={styles.topRow}>
      <Text style={styles.rank}>#{rank}</Text>
      <Text style={styles.score}>{item.score.toFixed(1)}</Text>
    </View>
    <Text style={styles.title}>{tText(item.title, locale)}</Text>
    <Text style={styles.summary}>{tText(item.summary, locale)}</Text>
    <Text style={styles.highlight}>{tText(item.highlight, locale)}</Text>
    <Text style={styles.meta}>
      {item.currentTravelers} travelers · {item.tags.join(" / ")}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  rank: {
    color: colors.coral,
    fontSize: 12,
    fontWeight: "800",
  },
  score: {
    color: colors.sand,
    fontSize: 12,
    fontWeight: "800",
  },
  title: {
    color: colors.cloud,
    fontSize: 18,
    fontWeight: "800",
  },
  summary: {
    color: "rgba(248,251,253,0.74)",
    fontSize: 13,
    lineHeight: 20,
  },
  highlight: {
    color: colors.mint,
    fontSize: 13,
    fontWeight: "700",
  },
  meta: {
    color: "rgba(248,251,253,0.54)",
    fontSize: 12,
  },
});
