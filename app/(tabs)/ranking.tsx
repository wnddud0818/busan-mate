import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";

import { Screen } from "../../src/components/common/screen";
import { RankingCard } from "../../src/components/ranking/ranking-card";
import { loadRankings } from "../../src/services/ranking-service";
import { useAppStore } from "../../src/stores/app-store";

export default function RankingTab() {
  const locale = useAppStore((state) => state.locale);
  const sharedItineraries = useAppStore((state) => state.sharedItineraries);
  const locationEvents = useAppStore((state) => state.locationEvents);
  const rankings = useAppStore((state) => state.rankings);
  const { refreshRankings } = useAppStore((state) => state.actions);
  const { t } = useTranslation();
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
      {list.map((item, index) => (
        <RankingCard key={item.id} item={item} locale={locale} rank={index + 1} />
      ))}
    </Screen>
  );
}
