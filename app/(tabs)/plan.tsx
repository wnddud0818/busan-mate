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
import { colors } from "../../src/theme/tokens";
import { TripPreferences } from "../../src/types/domain";

export default function PlanTab() {
  const locale = useAppStore((state) => state.locale);
  const itineraries = useAppStore((state) => state.itineraries);
  const notices = useAppStore((state) => state.notices);
  const { upsertItinerary, setNotices } = useAppStore((state) => state.actions);
  const { t } = useTranslation();

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
      {notices.length > 0 ? (
        <SectionCard>
          {notices.map((notice) => (
            <Text key={notice} style={{ color: colors.sand, lineHeight: 20 }}>
              {notice}
            </Text>
          ))}
        </SectionCard>
      ) : null}

      <TripPreferencesForm
        locale={locale}
        isSubmitting={itineraryMutation.isPending}
        onSubmit={(values) => itineraryMutation.mutate(values)}
      />

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
    </Screen>
  );
}
