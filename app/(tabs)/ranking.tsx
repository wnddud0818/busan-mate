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

  const rankingQuery = useQuery({
    queryKey: ["rankings", sharedItineraries.length, locationEvents.length],
    queryFn: () => loadRankings({ sharedItineraries, locationEvents }),
  });

  useEffect(() => {
    refreshRankings();
  }, [refreshRankings, sharedItineraries.length, locationEvents.length]);

  const list = rankingQuery.data ?? rankings;

  return (
    <Screen title={t("ranking.title")} subtitle={t("ranking.subtitle")}>
      {list.map((item, index) => (
        <RankingCard key={item.id} item={item} locale={locale} rank={index + 1} />
      ))}
    </Screen>
  );
}
