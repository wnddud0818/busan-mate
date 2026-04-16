import { useMemo } from "react";
import { Control, Controller } from "react-hook-form";
import { StyleSheet, Text, TextInput, View } from "react-native";

import { AppLocale, TripPreferences } from "../../../types/domain";
import { ColorPalette, radii, spacing } from "../../../theme/tokens";
import { useColors } from "../../../theme/use-colors";
import { formatKrwCompact } from "../../../utils/currency";
import { Pill } from "../../common/pill";
import { StepFrame } from "../step-frame";

const budgetQuickPicks = [120000, 200000, 300000, 450000];

const numericValue = (text: string) => {
  const digits = text.replace(/\D/g, "");
  return Number(digits || 0);
};

interface StepBudgetProps {
  control: Control<TripPreferences>;
  locale: AppLocale;
}

export const StepBudget = ({ control, locale }: StepBudgetProps) => {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  return (
    <StepFrame
      greeting={
        locale === "ko"
          ? "반가워요~~ 즐거운 부산여행을 위한 계획을 세워드릴게요"
          : "Hi there~~ Let me plan your fun Busan trip"
      }
      prompt={locale === "ko" ? "먼저, 총 예산은 얼마인가요?" : "First off, what's your total budget?"}
      helper={
        locale === "ko"
          ? "최소 30,000원부터 가능해요. 프리셋을 눌러 빠르게 설정할 수도 있어요."
          : "Minimum KRW 30,000. Tap a preset for a quick pick."
      }
    >
      <Controller
        control={control}
        name="totalBudgetKrw"
        render={({ field: { onChange, value } }) => (
          <View style={styles.field}>
            <View style={styles.inputWrap}>
              <Text style={styles.currency}>₩</Text>
              <TextInput
                value={value ? value.toLocaleString() : ""}
                onChangeText={(text) => onChange(numericValue(text))}
                style={styles.input}
                keyboardType="number-pad"
                placeholder={locale === "ko" ? "200,000" : "200,000"}
                placeholderTextColor={colors.fog}
              />
            </View>
            <Text style={styles.preview}>
              {value > 0
                ? formatKrwCompact(value, locale)
                : locale === "ko"
                ? "금액을 입력해주세요"
                : "Enter an amount"}
            </Text>
            <View style={styles.pillRow}>
              {budgetQuickPicks.map((amount) => (
                <Pill
                  key={amount}
                  label={formatKrwCompact(amount, locale)}
                  selected={value === amount}
                  onPress={() => onChange(amount)}
                />
              ))}
            </View>
          </View>
        )}
      />
    </StepFrame>
  );
};

const makeStyles = (c: ColorPalette) =>
  StyleSheet.create({
    field: { gap: spacing.sm },
    inputWrap: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: c.input,
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: c.line,
      paddingHorizontal: spacing.md,
    },
    currency: { color: c.coral, fontSize: 22, fontWeight: "800", marginRight: 6 },
    input: {
      flex: 1,
      color: c.cloud,
      fontSize: 22,
      fontWeight: "800",
      paddingVertical: spacing.md,
      letterSpacing: 0.2,
    },
    preview: { color: c.mint, fontSize: 13, fontWeight: "700", paddingHorizontal: 2 },
    pillRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, paddingTop: 4 },
  });
