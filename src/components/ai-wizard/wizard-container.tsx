import { zodResolver } from "@hookform/resolvers/zod";
import { addDays, format } from "date-fns";
import { useCallback, useMemo, useRef, useState } from "react";
import { FieldPath, useForm } from "react-hook-form";
import { Animated, Easing, Pressable, StyleSheet, Text, View } from "react-native";

import { deriveBudgetLevel } from "../../features/itinerary/planning";
import { tripPreferencesSchema } from "../../features/itinerary/schema";
import { AppLocale, TripPreferences } from "../../types/domain";
import { ColorPalette, radii, spacing } from "../../theme/tokens";
import { useColors } from "../../theme/use-colors";
import { formatKrwCompact } from "../../utils/currency";
import { startAreasById } from "../../data/start-areas";
import { StepBudget } from "./steps/step-budget";
import { StepDate } from "./steps/step-date";
import { StepInterests } from "./steps/step-interests";
import { StepParty } from "./steps/step-party";
import { StepPreferences } from "./steps/step-preferences";

const STEP_COUNT = 5;

type StepFields = Array<FieldPath<TripPreferences>>;

const stepFields: StepFields[] = [
  ["totalBudgetKrw"],
  ["partySize", "companionType"],
  ["travelDate", "tripDays"],
  ["startAreaId", "interests"],
  ["mobilityMode", "accessibilityNeeds", "indoorFallback", "includeLodgingCost"],
];

interface WizardContainerProps {
  locale: AppLocale;
  onSubmit: (values: TripPreferences) => void;
  onClose: () => void;
  isSubmitting: boolean;
}

export const WizardContainer = ({ locale, onSubmit, onClose, isSubmitting }: WizardContainerProps) => {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const { control, handleSubmit, trigger, watch } = useForm<TripPreferences>({
    resolver: zodResolver(tripPreferencesSchema),
    defaultValues: {
      tripDays: 2,
      totalBudgetKrw: 200000,
      partySize: 2,
      travelDate: format(addDays(new Date(), 1), "yyyy-MM-dd"),
      startAreaId: "seomyeon",
      companionType: "friends",
      interests: ["food", "culture", "night"],
      budgetLevel: "balanced",
      mobilityMode: "mixed",
      accessibilityNeeds: false,
      indoorFallback: true,
      includeLodgingCost: true,
      locale,
    },
  });

  const totalBudgetKrw = watch("totalBudgetKrw");
  const partySize = watch("partySize");
  const travelDate = watch("travelDate");
  const tripDays = watch("tripDays");
  const startAreaId = watch("startAreaId");

  const [stepIndex, setStepIndex] = useState(0);
  const translateX = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const transitioning = useRef(false);

  const runTransition = useCallback(
    (target: number, direction: 1 | -1) => {
      if (transitioning.current) return;
      transitioning.current = true;
      Animated.parallel([
        Animated.timing(translateX, {
          toValue: -30 * direction,
          duration: 180,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 180,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start(() => {
        setStepIndex(target);
        translateX.setValue(30 * direction);
        Animated.parallel([
          Animated.timing(translateX, {
            toValue: 0,
            duration: 220,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 1,
            duration: 220,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ]).start(() => {
          transitioning.current = false;
        });
      });
    },
    [opacity, translateX]
  );

  const goNext = useCallback(async () => {
    const fields = stepFields[stepIndex];
    const ok = fields ? await trigger(fields, { shouldFocus: true }) : true;
    if (!ok) return;
    if (stepIndex < STEP_COUNT - 1) {
      runTransition(stepIndex + 1, 1);
    } else {
      handleSubmit((values) => {
        onSubmit({
          ...values,
          locale,
          budgetLevel: deriveBudgetLevel(values),
        });
      })();
    }
  }, [handleSubmit, locale, onSubmit, runTransition, stepIndex, trigger]);

  const goBack = useCallback(() => {
    if (stepIndex === 0) {
      onClose();
      return;
    }
    runTransition(stepIndex - 1, -1);
  }, [onClose, runTransition, stepIndex]);

  const summaryChipsForLater = useMemo(() => {
    const chips: string[] = [];
    if (totalBudgetKrw > 0) {
      chips.push(
        locale === "ko"
          ? `예산 ${formatKrwCompact(totalBudgetKrw, "ko")}`
          : `Budget ${formatKrwCompact(totalBudgetKrw, "en")}`
      );
    }
    chips.push(locale === "ko" ? `${partySize}명` : `${partySize} pax`);
    if (tripDays) {
      chips.push(locale === "ko" ? `${tripDays}일` : `${tripDays}${tripDays > 1 ? "d" : "d"}`);
    }
    return chips;
  }, [totalBudgetKrw, partySize, tripDays, locale]);

  const finalChips = useMemo(() => {
    const chips = [...summaryChipsForLater];
    const area = startAreasById[startAreaId];
    if (area) {
      chips.push(
        locale === "ko" ? `${area.name.ko} 출발` : `from ${area.name.en}`
      );
    }
    return chips;
  }, [summaryChipsForLater, startAreaId, locale]);

  const renderStep = () => {
    switch (stepIndex) {
      case 0:
        return <StepBudget control={control} locale={locale} />;
      case 1:
        return <StepParty control={control} locale={locale} totalBudgetKrw={totalBudgetKrw} />;
      case 2:
        return (
          <StepDate
            control={control}
            locale={locale}
            totalBudgetKrw={totalBudgetKrw}
            partySize={partySize}
            travelDate={travelDate}
            tripDays={tripDays}
          />
        );
      case 3:
        return (
          <StepInterests
            control={control}
            locale={locale}
            summaryChips={summaryChipsForLater}
          />
        );
      case 4:
        return (
          <StepPreferences control={control} locale={locale} summaryChips={finalChips} />
        );
      default:
        return null;
    }
  };

  const isLast = stepIndex === STEP_COUNT - 1;
  const primaryLabel = isLast
    ? isSubmitting
      ? locale === "ko"
        ? "생성 중…"
        : "Generating…"
      : locale === "ko"
      ? "AI 일정 생성"
      : "Generate itinerary"
    : locale === "ko"
    ? "다음 →"
    : "Next →";

  const backLabel =
    stepIndex === 0
      ? locale === "ko"
        ? "닫기"
        : "Close"
      : locale === "ko"
      ? "← 이전"
      : "← Back";

  return (
    <View style={styles.wrapper}>
      <View style={styles.progressRow}>
        {Array.from({ length: STEP_COUNT }).map((_, idx) => {
          const active = idx === stepIndex;
          const passed = idx < stepIndex;
          return (
            <View
              key={idx}
              style={[
                styles.dot,
                passed && styles.dotPassed,
                active && styles.dotActive,
              ]}
            />
          );
        })}
      </View>

      <Animated.View
        style={[
          styles.stepArea,
          { transform: [{ translateX }], opacity },
        ]}
      >
        {renderStep()}
      </Animated.View>

      <View style={styles.footer}>
        <Pressable
          onPress={goBack}
          style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
          disabled={isSubmitting}
        >
          <Text style={styles.backBtnText}>{backLabel}</Text>
        </Pressable>
        <Pressable
          onPress={goNext}
          style={({ pressed }) => [
            styles.nextBtn,
            pressed && styles.pressed,
            isSubmitting && styles.disabled,
          ]}
          disabled={isSubmitting}
        >
          <Text style={styles.nextBtnText}>{primaryLabel}</Text>
        </Pressable>
      </View>
    </View>
  );
};

const makeStyles = (c: ColorPalette) =>
  StyleSheet.create({
    wrapper: { gap: spacing.lg, paddingBottom: spacing.lg },
    progressRow: {
      flexDirection: "row",
      gap: 6,
      paddingHorizontal: 2,
      paddingTop: spacing.xs,
    },
    dot: {
      flex: 1,
      height: 6,
      borderRadius: 3,
      backgroundColor: c.lineBright,
    },
    dotPassed: { backgroundColor: c.coralBorder },
    dotActive: { backgroundColor: c.coral },
    stepArea: { gap: spacing.md },
    footer: {
      flexDirection: "row",
      gap: spacing.sm,
      paddingTop: spacing.sm,
    },
    backBtn: {
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      borderRadius: radii.md,
      backgroundColor: c.glass,
      borderWidth: 1,
      borderColor: c.line,
      alignItems: "center",
      justifyContent: "center",
    },
    backBtnText: { color: c.cloud, fontSize: 14, fontWeight: "700" },
    nextBtn: {
      flex: 1,
      paddingVertical: spacing.md,
      borderRadius: radii.md,
      backgroundColor: c.coral,
      alignItems: "center",
      justifyContent: "center",
    },
    nextBtnText: { color: c.navy, fontSize: 15, fontWeight: "800" },
    pressed: { opacity: 0.85 },
    disabled: { opacity: 0.55 },
  });
