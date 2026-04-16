import { useMutation } from "@tanstack/react-query";
import { router } from "expo-router";
import { Text } from "react-native";
import { useTranslation } from "react-i18next";

import { Screen } from "../../src/components/common/screen";
import { SectionCard } from "../../src/components/common/section-card";
import { TripPreferencesForm } from "../../src/components/forms/trip-preferences-form";
import { ItineraryCard } from "../../src/components/itinerary/itinerary-card";
import { generateItinerary } from "../../src/services/itinerary-service";
import { useAppStore } from "../../src/stores/app-store";
import { useColors } from "../../src/theme/use-colors";
import { TripPreferences } from "../../src/types/domain";

export default function PlanTab() {
  const locale = useAppStore((state) => state.locale);
  const itineraries = useAppStore((state) => state.itineraries);
  const notices = useAppStore((state) => state.notices);
  const { upsertItinerary, setNotices } = useAppStore((state) => state.actions);
  const { t } = useTranslation();
  const colors = useColors();

  const itineraryMutation = useMutation({
    mutationFn: (values: TripPreferences) => generateItinerary(values),
    onSuccess: ({ itinerary, warnings }) => {
      upsertItinerary(itinerary);
      setNotices(warnings);
      router.push(`/itinerary/${itinerary.id}`);
    },
  });

  return (
    <Screen title={t("plan.title")} subtitle={t("plan.subtitle")}>
      {/* 날씨·주의 알림 */}
      {notices.length > 0 ? (
        <SectionCard variant="warning">
          {notices.map((notice) => (
            <Text key={notice} style={{ color: colors.sand, lineHeight: 21, fontSize: 14 }}>
              {notice}
            </Text>
          ))}
        </SectionCard>
      ) : null}

      {/* 일정 생성 폼 */}
      <TripPreferencesForm
        locale={locale}
        isSubmitting={itineraryMutation.isPending}
        onSubmit={(values) => itineraryMutation.mutate(values)}
      />

      {/* 최근 생성 일정 */}
      {itineraries.length > 0 ? (
        <SectionCard title={t("plan.recent")} hint={t("common.fallback")}>
          {itineraries.slice(0, 3).map((itinerary) => (
            <ItineraryCard
              key={itinerary.id}
              itinerary={itinerary}
              locale={locale}
              onPress={() => router.push(`/itinerary/${itinerary.id}`)}
            />
          ))}
        </SectionCard>
      ) : null}
    </Screen>
  );
}
