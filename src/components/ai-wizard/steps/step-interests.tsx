import { useMemo } from "react";
import { Control, Controller } from "react-hook-form";
import { StyleSheet, Text, View } from "react-native";

import { startAreas } from "../../../data/start-areas";
import { AppLocale, InterestTag, TripPreferences } from "../../../types/domain";
import { ColorPalette, spacing } from "../../../theme/tokens";
import { useColors } from "../../../theme/use-colors";
import { Pill } from "../../common/pill";
import { StepFrame } from "../step-frame";

const interestOptions: { id: InterestTag; ko: string; en: string; emoji: string }[] = [
  { id: "food", ko: "맛집", en: "Food", emoji: "\uD83C\uDF5C" },
  { id: "culture", ko: "문화", en: "Culture", emoji: "\uD83C\uDFAD" },
  { id: "nature", ko: "자연", en: "Nature", emoji: "\uD83C\uDF3F" },
  { id: "photospot", ko: "포토스팟", en: "Photo", emoji: "\uD83D\uDCF8" },
  { id: "shopping", ko: "쇼핑", en: "Shopping", emoji: "\uD83D\uDECD\uFE0F" },
  { id: "history", ko: "역사", en: "History", emoji: "\uD83C\uDFDB\uFE0F" },
  { id: "night", ko: "야경", en: "Night", emoji: "\uD83C\uDF03" },
  { id: "healing", ko: "힐링", en: "Healing", emoji: "\uD83E\uDDD8" },
];

interface StepInterestsProps {
  control: Control<TripPreferences>;
  locale: AppLocale;
  summaryChips: string[];
}

export const StepInterests = ({ control, locale, summaryChips }: StepInterestsProps) => {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  return (
    <StepFrame
      summaryChips={summaryChips}
      prompt={
        locale === "ko"
          ? "어디서 출발하고, 뭘 좋아하세요?"
          : "Where will you start, and what do you enjoy?"
      }
      helper={
        locale === "ko"
          ? "관심사는 하나 이상 선택해 주세요 (여러 개 선택 가능)."
          : "Pick at least one interest — multi-select is supported."
      }
    >
      <View style={styles.block}>
        <Text style={styles.label}>{locale === "ko" ? "출발 지역" : "Starting area"}</Text>
        <Controller
          control={control}
          name="startAreaId"
          render={({ field: { onChange, value } }) => (
            <View style={styles.pillGrid}>
              {startAreas.map((area) => (
                <Pill
                  key={area.id}
                  label={area.name[locale]}
                  selected={value === area.id}
                  onPress={() => onChange(area.id)}
                />
              ))}
            </View>
          )}
        />
      </View>

      <View style={styles.block}>
        <Text style={styles.label}>{locale === "ko" ? "관심사" : "Interests"}</Text>
        <Controller
          control={control}
          name="interests"
          render={({ field: { onChange, value } }) => (
            <View style={styles.pillGrid}>
              {interestOptions.map((opt) => {
                const selected = value.includes(opt.id);
                return (
                  <Pill
                    key={opt.id}
                    label={`${opt.emoji} ${locale === "ko" ? opt.ko : opt.en}`}
                    selected={selected}
                    onPress={() => {
                      const next = selected
                        ? value.filter((tag) => tag !== opt.id)
                        : [...value, opt.id];
                      onChange(next.length > 0 ? next : value);
                    }}
                  />
                );
              })}
            </View>
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
    pillGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  });
