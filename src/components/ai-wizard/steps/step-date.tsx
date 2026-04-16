import { useQuery } from "@tanstack/react-query";
import { addDays, format } from "date-fns";
import { useMemo } from "react";
import { Control, Controller } from "react-hook-form";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { startAreasById } from "../../../data/start-areas";
import {
  fetchWeatherSnapshot,
  WEATHER_FORECAST_WINDOW_DAYS,
} from "../../../services/weather-service";
import { AppLocale, StartAreaId, TripPreferences } from "../../../types/domain";
import { ColorPalette, radii, spacing } from "../../../theme/tokens";
import { useColors } from "../../../theme/use-colors";
import { formatKrwCompact } from "../../../utils/currency";
import { Pill } from "../../common/pill";
import { StepFrame } from "../step-frame";

const tripDayChoices = [1, 2, 3, 4, 5] as const;

const buildDateChoices = (count = WEATHER_FORECAST_WINDOW_DAYS) =>
  Array.from({ length: count }, (_, index) => format(addDays(new Date(), index), "yyyy-MM-dd"));

const formatDateLabel = (iso: string, locale: AppLocale) => {
  const date = new Date(`${iso}T00:00:00+09:00`);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const weekdayKo = ["일", "월", "화", "수", "목", "금", "토"][date.getDay()];
  const weekdayEn = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][date.getDay()];
  return locale === "ko" ? `${month}/${day} (${weekdayKo})` : `${month}/${day} ${weekdayEn}`;
};

interface StepDateProps {
  control: Control<TripPreferences>;
  locale: AppLocale;
  totalBudgetKrw: number;
  partySize: number;
  startAreaId: StartAreaId;
  travelDate: string;
  tripDays: number;
}

export const StepDate = ({
  control,
  locale,
  totalBudgetKrw,
  partySize,
  startAreaId,
  travelDate,
  tripDays,
}: StepDateProps) => {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const dateChoices = useMemo(() => buildDateChoices(), []);
  const startAreaName = startAreasById[startAreaId]?.name[locale];

  const weatherQuery = useQuery({
    queryKey: ["ai-wizard-weather-preview", startAreaId, travelDate],
    queryFn: () => fetchWeatherSnapshot({ startAreaId, travelDate }),
    enabled: Boolean(startAreaId && travelDate),
  });

  const summaryChips = useMemo(() => {
    const chips: string[] = [];
    if (totalBudgetKrw > 0) {
      chips.push(
        locale === "ko"
          ? `예산 ${formatKrwCompact(totalBudgetKrw, "ko")}`
          : `Budget ${formatKrwCompact(totalBudgetKrw, "en")}`
      );
    }
    chips.push(locale === "ko" ? `${partySize}명` : `${partySize} pax`);
    return chips;
  }, [totalBudgetKrw, partySize, locale]);

  const summaryText = useMemo(() => {
    if (!travelDate) return null;
    const shortLabel = formatDateLabel(travelDate, locale);
    return locale === "ko"
      ? `${shortLabel} 출발, 총 ${tripDays}일 여행`
      : `Depart ${shortLabel} for ${tripDays} ${tripDays > 1 ? "days" : "day"}`;
  }, [travelDate, tripDays, locale]);

  const startAreaHint = useMemo(() => {
    if (!startAreaName) return null;
    return locale === "ko"
      ? `${startAreaName} 기준 예보예요. 출발지는 다음 단계에서 바꿀 수 있어요.`
      : `Forecast for ${startAreaName}. You can change the starting area on the next step.`;
  }, [locale, startAreaName]);

  return (
    <StepFrame
      summaryChips={summaryChips}
      prompt={
        locale === "ko"
          ? "여행 날짜와 기간은 어떻게 되나요?"
          : "When are you travelling, and for how long?"
      }
    >
      <View style={styles.block}>
        <Text style={styles.label}>{locale === "ko" ? "여행 날짜" : "Departure date"}</Text>
        <Controller
          control={control}
          name="travelDate"
          render={({ field: { onChange, value } }) => (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.dateStrip}
            >
              {dateChoices.map((iso) => (
                <Pill
                  key={iso}
                  label={formatDateLabel(iso, locale)}
                  selected={value === iso}
                  onPress={() => onChange(iso)}
                />
              ))}
            </ScrollView>
          )}
        />
      </View>

      <View style={styles.block}>
        <Text style={styles.label}>{locale === "ko" ? "여행 기간" : "Trip length"}</Text>
        <Controller
          control={control}
          name="tripDays"
          render={({ field: { onChange, value } }) => (
            <View style={styles.pillRow}>
              {tripDayChoices.map((day) => (
                <Pill
                  key={day}
                  label={locale === "ko" ? `${day}일` : `${day} ${day > 1 ? "days" : "day"}`}
                  selected={value === day}
                  onPress={() => onChange(day)}
                />
              ))}
            </View>
          )}
        />
      </View>

      {summaryText ? (
        <View style={styles.summaryCard}>
          <Text style={styles.summaryText}>{summaryText}</Text>
        </View>
      ) : null}

      {weatherQuery.isLoading ? (
        <View style={styles.previewCard}>
          <Text style={styles.previewLabel}>
            {locale === "ko" ? "날씨 미리보기" : "Weather preview"}
          </Text>
          <Text style={styles.previewHint}>
            {locale === "ko" ? "예보를 불러오는 중이에요..." : "Loading forecast..."}
          </Text>
        </View>
      ) : weatherQuery.data ? (
        <View style={[styles.previewCard, styles.weatherCard]}>
          <Text style={styles.previewLabel}>
            {locale === "ko" ? "날씨 미리보기" : "Weather preview"}
          </Text>
          <Text style={styles.previewValue}>{weatherQuery.data.summary[locale]}</Text>
          {startAreaHint ? <Text style={styles.previewHint}>{startAreaHint}</Text> : null}
          {typeof weatherQuery.data.temperatureMaxC === "number" &&
          typeof weatherQuery.data.temperatureMinC === "number" ? (
            <Text style={styles.previewHint}>
              {locale === "ko"
                ? `최저 ${weatherQuery.data.temperatureMinC}° / 최고 ${weatherQuery.data.temperatureMaxC}° / 강수 ${weatherQuery.data.precipitationProbabilityMax ?? 0}%`
                : `Low ${weatherQuery.data.temperatureMinC}° / High ${weatherQuery.data.temperatureMaxC}° / Rain ${weatherQuery.data.precipitationProbabilityMax ?? 0}%`}
            </Text>
          ) : null}
        </View>
      ) : null}
    </StepFrame>
  );
};

const makeStyles = (c: ColorPalette) =>
  StyleSheet.create({
    block: { gap: spacing.sm },
    label: { color: c.cloud, fontSize: 13, fontWeight: "700" },
    dateStrip: { flexDirection: "row", gap: spacing.sm, paddingRight: spacing.md },
    pillRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
    summaryCard: {
      backgroundColor: c.mintLight,
      borderColor: c.mintBorder,
      borderWidth: 1,
      borderRadius: radii.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    summaryText: { color: c.mint, fontSize: 13, fontWeight: "800" },
    previewCard: {
      backgroundColor: c.glass,
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: c.line,
      padding: spacing.md,
      gap: 5,
    },
    weatherCard: { backgroundColor: c.mintLight, borderColor: c.mintBorder },
    previewLabel: {
      color: c.mint,
      fontSize: 11,
      fontWeight: "800",
      textTransform: "uppercase",
      letterSpacing: 0.6,
    },
    previewValue: { color: c.cloud, fontSize: 15, fontWeight: "800", lineHeight: 22 },
    previewHint: { color: c.mist, fontSize: 12, lineHeight: 18 },
  });
