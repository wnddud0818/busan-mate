import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { Text, View } from "react-native";
import { useTranslation } from "react-i18next";

import { Screen } from "../../src/components/common/screen";
import { SectionCard } from "../../src/components/common/section-card";
import { ItineraryCard } from "../../src/components/itinerary/itinerary-card";
import { useAppStore } from "../../src/stores/app-store";
import { spacing } from "../../src/theme/tokens";
import { useColors } from "../../src/theme/use-colors";

export default function LibraryTab() {
  const colors = useColors();
  const locale = useAppStore((state) => state.locale);
  const itineraries = useAppStore((state) => state.itineraries);
  const activeSession = useAppStore((state) => state.activeSession);
  const { t } = useTranslation();

  return (
    <Screen title={t("library.title")} subtitle={t("library.subtitle")}>
      {activeSession ? (
        <SectionCard variant="highlight" title={locale === "ko" ? "진행 중인 여행" : "Active trip session"}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Feather name="navigation" size={14} color={colors.mint} />
            <Text style={{ color: colors.cloud, fontSize: 14, flex: 1, lineHeight: 20 }}>
              {locale === "ko"
                ? `Day ${activeSession.currentDay}, Stop ${activeSession.currentStopOrder} 안내 진행 중`
                : `Guiding Day ${activeSession.currentDay}, Stop ${activeSession.currentStopOrder}`}
            </Text>
          </View>
        </SectionCard>
      ) : null}

      {itineraries.length === 0 ? (
        <SectionCard>
          <View style={{ alignItems: "center", paddingVertical: spacing.xl, gap: spacing.md }}>
            <Feather name="map" size={44} color={colors.lineBright} />
            <Text style={{ color: colors.mist, textAlign: "center", lineHeight: 22, fontSize: 14 }}>
              {t("library.empty")}
            </Text>
          </View>
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
