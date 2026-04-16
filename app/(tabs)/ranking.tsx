import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { Text, View } from "react-native";
import { useTranslation } from "react-i18next";

import { Screen } from "../../src/components/common/screen";
import { RankingCard } from "../../src/components/ranking/ranking-card";
import { loadRankings } from "../../src/services/ranking-service";
import { useAppStore } from "../../src/stores/app-store";
import { spacing } from "../../src/theme/tokens";
import { useColors } from "../../src/theme/use-colors";

export default function RankingTab() {
  const locale = useAppStore((state) => state.locale);
  const sharedItineraries = useAppStore((state) => state.sharedItineraries);
  const locationEvents = useAppStore((state) => state.locationEvents);
  const rankings = useAppStore((state) => state.rankings);
  const { refreshRankings } = useAppStore((state) => state.actions);
  const { t } = useTranslation();
  const colors = useColors();

  const sharedSignature = sharedItineraries
    .map((item) => `${item.id}:${item.ratingAverage}:${item.currentTravelers}:${item.score}`)
    .join("|");
  const locationSignature = locationEvents
    .map((item) => `${item.id}:${item.tripSessionId}:${item.capturedAt}`)
    .join("|");

  const rankingQuery = useQuery({
    queryKey: ["rankings", sharedSignature, locationSignature],
    queryFn: () => loadRankings({ sharedItineraries, locationEvents }),
  });

  useEffect(() => {
    refreshRankings();
  }, [locationSignature, refreshRankings, sharedSignature]);

  const list = rankingQuery.data ?? rankings;

  return (
    <Screen title={t("ranking.title")} subtitle={t("ranking.subtitle")}>
      {rankingQuery.isLoading ? (
        <View style={{ alignItems: "center", paddingVertical: spacing.xl }}>
          <Text style={{ color: colors.mist, fontSize: 14 }}>
            {locale === "ko" ? "랭킹 불러오는 중..." : "Loading rankings..."}
          </Text>
        </View>
      ) : list.length === 0 ? (
        <View
          style={{
            alignItems: "center",
            paddingVertical: spacing.xl + 8,
            gap: spacing.md,
          }}
        >
          <Feather name="trending-up" size={44} color={colors.lineBright} />
          <Text style={{ color: colors.mist, textAlign: "center", lineHeight: 22, fontSize: 14 }}>
            {locale === "ko" ? "아직 랭킹 데이터가 없어요." : "No ranking data yet."}
          </Text>
        </View>
      ) : (
        list.map((item, index) => (
          <RankingCard key={item.id} item={item} locale={locale} rank={index + 1} />
        ))
      )}
    </Screen>
  );
}
