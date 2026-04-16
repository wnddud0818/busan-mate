import { Feather } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

import { colors, radii, spacing } from "../../theme/tokens";
import { RankingSnapshot } from "../../types/domain";
import { tText } from "../../utils/localized";

const MEDAL: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };

const medalColor = (rank: number): string => {
  if (rank === 1) return colors.gold;
  if (rank === 2) return colors.silver;
  if (rank === 3) return colors.bronze;
  return colors.mist;
};

const cardBackground = (rank: number): string => {
  if (rank === 1) return "rgba(245,200,66,0.10)";
  if (rank === 2) return "rgba(168,186,196,0.08)";
  if (rank === 3) return "rgba(205,127,50,0.09)";
  return "rgba(255,255,255,0.06)";
};

const cardBorder = (rank: number): string => {
  if (rank === 1) return "rgba(245,200,66,0.28)";
  if (rank === 2) return "rgba(168,186,196,0.22)";
  if (rank === 3) return "rgba(205,127,50,0.24)";
  return colors.line;
};

export const RankingCard = ({
  item,
  locale,
  rank,
}: {
  item: RankingSnapshot;
  locale: "ko" | "en";
  rank: number;
}) => (
  <View
    style={[
      styles.card,
      {
        backgroundColor: cardBackground(rank),
        borderColor: cardBorder(rank),
      },
    ]}
  >
    {/* 상단 행: 순위 + 점수 */}
    <View style={styles.topRow}>
      <View style={styles.rankGroup}>
        <Text style={[styles.rank, { color: medalColor(rank) }]}>#{rank}</Text>
        {rank <= 3 ? <Text style={styles.medal}>{MEDAL[rank]}</Text> : null}
      </View>
      <View style={styles.scoreGroup}>
        <Feather name="star" size={11} color={colors.sand} />
        <Text style={styles.score}>{item.score.toFixed(1)}</Text>
      </View>
    </View>

    {/* 제목 */}
    <Text style={styles.title}>{tText(item.title, locale)}</Text>

    {/* 요약 */}
    <Text style={styles.summary}>{tText(item.summary, locale)}</Text>

    {/* 하이라이트 */}
    <Text style={styles.highlight}>{tText(item.highlight, locale)}</Text>

    {/* 하단 메타 */}
    <View style={styles.metaRow}>
      <Feather name="users" size={11} color={colors.mist} />
      <Text style={styles.meta}>
        {item.currentTravelers}
        {locale === "ko" ? "명 여행 중" : " travelers"}
      </Text>
      {item.tags.length > 0 ? (
        <>
          <Text style={styles.metaDot}>·</Text>
          <Text style={styles.meta}>{item.tags.join(" · ")}</Text>
        </>
      ) : null}
    </View>
  </View>
);

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
    color: colors.sand,
    fontSize: 13,
    fontWeight: "800",
  },
  title: {
    color: colors.cloud,
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: -0.3,
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
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    flexWrap: "wrap",
  },
  meta: {
    color: colors.mist,
    fontSize: 12,
  },
  metaDot: {
    color: colors.fog,
    fontSize: 12,
  },
});
