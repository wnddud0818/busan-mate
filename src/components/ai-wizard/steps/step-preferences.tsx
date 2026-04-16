import { useMemo } from "react";
import { Control, Controller } from "react-hook-form";
import { StyleSheet, Text, View } from "react-native";

import { AppLocale, TripPreferences } from "../../../types/domain";
import { ColorPalette, spacing } from "../../../theme/tokens";
import { useColors } from "../../../theme/use-colors";
import { Pill } from "../../common/pill";
import { StepFrame } from "../step-frame";
import { SwitchRow } from "../switch-row";

const mobilityOptions = [
  { id: "transit", ko: "대중교통", en: "Transit", emoji: "\uD83D\uDE8C" },
  { id: "walk", ko: "도보 위주", en: "Walk-first", emoji: "\uD83D\uDEB6" },
  { id: "mixed", ko: "혼합", en: "Mixed", emoji: "\uD83D\uDD00" },
] as const;

interface StepPreferencesProps {
  control: Control<TripPreferences>;
  locale: AppLocale;
  summaryChips: string[];
}

export const StepPreferences = ({ control, locale, summaryChips }: StepPreferencesProps) => {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  return (
    <StepFrame
      summaryChips={summaryChips}
      prompt={
        locale === "ko"
          ? "마지막으로 몇 가지만 확인할게요!"
          : "One last round of quick checks!"
      }
      helper={
        locale === "ko"
          ? "바꾸고 싶은 게 없다면 기본값 그대로 두셔도 괜찮아요."
          : "Leave any toggle at its default if you don't have a preference."
      }
    >
      <View style={styles.block}>
        <Text style={styles.label}>{locale === "ko" ? "이동 성향" : "Mobility"}</Text>
        <Controller
          control={control}
          name="mobilityMode"
          render={({ field: { onChange, value } }) => (
            <View style={styles.pillRow}>
              {mobilityOptions.map((opt) => (
                <Pill
                  key={opt.id}
                  label={`${opt.emoji} ${locale === "ko" ? opt.ko : opt.en}`}
                  selected={value === opt.id}
                  onPress={() => onChange(opt.id)}
                />
              ))}
            </View>
          )}
        />
      </View>

      <View style={styles.switches}>
        <Controller
          control={control}
          name="accessibilityNeeds"
          render={({ field: { onChange, value } }) => (
            <SwitchRow
              accent="coral"
              value={value}
              onChange={onChange}
              label={locale === "ko" ? "무장애 우선" : "Accessibility first"}
              hint={
                locale === "ko"
                  ? "유모차·휠체어 동선을 우선 반영"
                  : "Prioritise stroller and wheelchair-friendly stops"
              }
            />
          )}
        />
        <Controller
          control={control}
          name="indoorFallback"
          render={({ field: { onChange, value } }) => (
            <SwitchRow
              accent="mint"
              value={value}
              onChange={onChange}
              label={locale === "ko" ? "실내 대체 허용" : "Indoor fallback"}
              hint={
                locale === "ko"
                  ? "날씨가 바뀌면 실내 비중이 높은 경로로 조정"
                  : "Swap to indoor-heavy routes when weather changes"
              }
            />
          )}
        />
        <Controller
          control={control}
          name="includeLodgingCost"
          render={({ field: { onChange, value } }) => (
            <SwitchRow
              accent="coral"
              value={value}
              onChange={onChange}
              label={locale === "ko" ? "숙소비 포함" : "Include lodging"}
              hint={
                locale === "ko"
                  ? "1박 이상 여행의 숙소비를 예산에 반영"
                  : "Count lodging in the total budget for overnight trips"
              }
            />
          )}
        />
      </View>
    </StepFrame>
  );
};

const makeStyles = (c: ColorPalette) =>
  StyleSheet.create({
    block: { gap: spacing.sm },
    label: { color: c.cloud, fontSize: 13, fontWeight: "700" },
    pillRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
    switches: { gap: spacing.sm, paddingTop: spacing.xs },
  });
