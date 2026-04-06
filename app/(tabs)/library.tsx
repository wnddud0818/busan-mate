import { router } from "expo-router";
import { Text } from "react-native";
import { useTranslation } from "react-i18next";

import { Screen } from "../../src/components/common/screen";
import { SectionCard } from "../../src/components/common/section-card";
import { ItineraryCard } from "../../src/components/itinerary/itinerary-card";
import { useAppStore } from "../../src/stores/app-store";

export default function LibraryTab() {
  const locale = useAppStore((state) => state.locale);
  const itineraries = useAppStore((state) => state.itineraries);
  const activeSession = useAppStore((state) => state.activeSession);
  const { t } = useTranslation();

  return (
    <Screen title={t("library.title")} subtitle={t("library.subtitle")}>
      {activeSession ? (
        <SectionCard title={locale === "ko" ? "활성 여행 세션" : "Active live session"}>
          <Text style={{ color: "white" }}>
            {locale === "ko"
              ? `현재 Day ${activeSession.currentDay}, Stop ${activeSession.currentStopOrder} 가이드 진행 중`
              : `Currently guiding Day ${activeSession.currentDay}, Stop ${activeSession.currentStopOrder}`}
          </Text>
        </SectionCard>
      ) : null}

      {itineraries.length === 0 ? (
        <SectionCard>
          <Text style={{ color: "white" }}>{t("library.empty")}</Text>
        </SectionCard>
      ) : (
        itineraries.map((itinerary) => (
          <ItineraryCard
            key={itinerary.id}
            itinerary={itinerary}
            locale={locale}
            onPress={() => router.push(`/itinerary/${itinerary.id}`)}
          />
        ))
      )}
    </Screen>
  );
}
