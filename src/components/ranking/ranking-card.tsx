import { Feather } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

import { radii, spacing } from "../../theme/tokens";
import { useColors } from "../../theme/use-colors";
import { RankingSnapshot } from "../../types/domain";
import { tText } from "../../utils/localized";

const MEDAL: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };

export const RankingCard = ({
  item,
  locale,
  rank,
}: {
  item: RankingSnapshot;
  locale: "ko" | "en";
  rank: number;
}) => {
  const colors = useColors();

  const cardBg =
    rank === 1 ? colors.medalGoldBg :
    rank === 2 ? colors.medalSilverBg :
    rank === 3 ? colors.medalBronzeBg :
    colors.surface;

  const cardBorder =
    rank === 1 ? colors.medalGoldBorder :
    rank === 2 ? colors.medalSilverBorder :
    rank === 3 ? colors.medalBronzeBorder :
    colors.line;

  const rankColor =
    rank === 1 ? colors.gold :
    rank === 2 ? colors.silver :
    rank === 3 ? colors.bronze :
    colors.mist;

  return (
    <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
      <View style={styles.topRow}>
        <View style={styles.rankGroup}>
          <Text style={[styles.rank, { color: rankColor }]}>#{rank}</Text>
          {rank <= 3 ? <Text style={styles.medal}>{MEDAL[rank]}</Text> : null}
        </View>
        <View style={styles.scoreGroup}>
          <Feather name="star" size={11} color={colors.sand} />
          <Text style={[styles.score, { color: colors.sand }]}>{item.score.toFixed(1)}</Text>
        </View>
      </View>

      <Text style={[styles.title, { color: colors.cloud }]}>{tText(item.title, locale)}</Text>
      <Text style={[styles.summary, { color: colors.mist }]}>{tText(item.summary, locale)}</Text>
      <Text style={[styles.highlight, { color: colors.mint }]}>{tText(item.highlight, locale)}</Text>

      <View style={styles.metaRow}>
        <Feather name="users" size={11} color={colors.mist} />
        <Text style={[styles.meta, { color: colors.mist }]}>
          {item.currentTravelers}{locale === "ko" ? "명 여행 중" : " travelers"}
        </Text>
        {item.tags.length > 0 ? (
          <>
            <Text style={[styles.metaDot, { color: colors.fog }]}>·</Text>
            <Text style={[styles.meta, { color: colors.mist }]}>{item.tags.join(" · ")}</Text>
          </>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.lg,
    borderWidth: 1,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  rankGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  rank: {
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: -0.3,
  },
  medal: {
    fontSize: 16,
  },
  scoreGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  score: {
    fontSize: 13,
    fontWeight: "800",
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  summary: {
    fontSize: 13,
    lineHeight: 20,
  },
  highlight: {
    fontSize: 13,
    fontWeight: "700",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    flexWrap: "wrap",
  },
  meta: {
    fontSize: 12,
  },
  metaDot: {
    fontSize: 12,
  },
});
