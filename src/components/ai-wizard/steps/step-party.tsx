import { useMemo } from "react";
import { Control, Controller } from "react-hook-form";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { AppLocale, TripPreferences } from "../../../types/domain";
import { ColorPalette, radii, spacing } from "../../../theme/tokens";
import { useColors } from "../../../theme/use-colors";
import { formatKrwCompact } from "../../../utils/currency";
import { Pill } from "../../common/pill";
import { StepFrame } from "../step-frame";

const companionOptions = [
  { id: "solo", ko: "혼자", en: "Solo", emoji: "\uD83D\uDEB6" },
  { id: "couple", ko: "커플", en: "Couple", emoji: "\uD83D\uDC91" },
  { id: "family", ko: "가족", en: "Family", emoji: "\uD83D\uDC6A" },
  { id: "friends", ko: "친구", en: "Friends", emoji: "\uD83E\uDD1D" },
] as const;

interface StepPartyProps {
  control: Control<TripPreferences>;
  locale: AppLocale;
  totalBudgetKrw: number;
}

export const StepParty = ({ control, locale, totalBudgetKrw }: StepPartyProps) => {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const summaryChip =
    totalBudgetKrw > 0
      ? locale === "ko"
        ? `예산 ${formatKrwCompact(totalBudgetKrw, "ko")}`
        : `Budget ${formatKrwCompact(totalBudgetKrw, "en")}`
      : null;

  return (
    <StepFrame
      summaryChips={summaryChip ? [summaryChip] : undefined}
      prompt={
        locale === "ko"
          ? "인원은 어떻게 되나요? 누구와 함께 가시나요?"
          : "How many people, and who are you travelling with?"
      }
    >
      <Controller
        control={control}
        name="partySize"
        render={({ field: { onChange, value } }) => (
          <View style={styles.stepperWrap}>
            <Pressable
              onPress={() => onChange(Math.max(1, value - 1))}
              style={({ pressed }) => [
                styles.stepperBtn,
                value <= 1 && styles.stepperBtnDisabled,
                pressed && value > 1 && styles.stepperBtnPressed,
              ]}
              disabled={value <= 1}
            >
              <Text style={styles.stepperSign}>−</Text>
            </Pressable>
            <View style={styles.countBox}>
              <Text style={styles.count}>{value}</Text>
              <Text style={styles.countUnit}>{locale === "ko" ? "명" : "pax"}</Text>
            </View>
            <Pressable
              onPress={() => onChange(Math.min(12, value + 1))}
              style={({ pressed }) => [
                styles.stepperBtn,
                value >= 12 && styles.stepperBtnDisabled,
                pressed && value < 12 && styles.stepperBtnPressed,
              ]}
              disabled={value >= 12}
            >
              <Text style={styles.stepperSign}>+</Text>
            </Pressable>
          </View>
        )}
      />

      <Controller
        control={control}
        name="companionType"
        render={({ field: { onChange, value } }) => (
          <View style={styles.companionRow}>
            {companionOptions.map((option) => (
              <Pill
                key={option.id}
                label={`${option.emoji} ${locale === "ko" ? option.ko : option.en}`}
                selected={value === option.id}
                onPress={() => onChange(option.id)}
              />
            ))}
          </View>
        )}
      />
    </StepFrame>
  );
};

const makeStyles = (c: ColorPalette) =>
  StyleSheet.create({
    stepperWrap: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: spacing.lg,
      paddingVertical: spacing.sm,
    },
    stepperBtn: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: c.coralLight,
      borderWidth: 1,
      borderColor: c.coralBorder,
      alignItems: "center",
      justifyContent: "center",
    },
    stepperBtnPressed: { backgroundColor: c.coral, borderColor: c.coral },
    stepperBtnDisabled: { opacity: 0.4 },
    stepperSign: { color: c.coral, fontSize: 28, fontWeight: "800", lineHeight: 30 },
    countBox: {
      minWidth: 90,
      alignItems: "center",
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
    },
    count: { color: c.cloud, fontSize: 40, fontWeight: "800", letterSpacing: -1 },
    countUnit: { color: c.mist, fontSize: 13, fontWeight: "700", marginTop: -2 },
    companionRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.sm,
      justifyContent: "center",
    },
  });
