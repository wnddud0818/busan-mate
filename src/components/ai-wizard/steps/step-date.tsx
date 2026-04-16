import { addDays, format } from "date-fns";
import { useMemo } from "react";
import { Control, Controller } from "react-hook-form";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { AppLocale, TripPreferences } from "../../../types/domain";
import { ColorPalette, radii, spacing } from "../../../theme/tokens";
import { useColors } from "../../../theme/use-colors";
import { formatKrwCompact } from "../../../utils/currency";
import { Pill } from "../../common/pill";
import { StepFrame } from "../step-frame";

const tripDayChoices = [1, 2, 3, 4, 5] as const;

const buildDateChoices = (count = 14) =>
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
  travelDate: string;
  tripDays: number;
}

export const StepDate = ({
  control,
  locale,
  totalBudgetKrw,
  partySize,
  travelDate,
  tripDays,
}: StepDateProps) => {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const dateChoices = useMemo(() => buildDateChoices(), []);

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
      ? `${shortLabel} 출발 · ${tripDays}일 여행`
      : `Depart ${shortLabel} · ${tripDays} ${tripDays > 1 ? "days" : "day"}`;
  }, [travelDate, tripDays, locale]);

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
        <Text style={styles.label}>{locale === "ko" ? "출발 날짜" : "Departure date"}</Text>
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
  });
