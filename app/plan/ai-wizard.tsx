import { Feather } from "@expo/vector-icons";
import { useMutation } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useCallback, useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { LoadingAnimation } from "../../src/components/ai-wizard/loading-animation";
import { WizardContainer } from "../../src/components/ai-wizard/wizard-container";
import { generateItinerary } from "../../src/services/itinerary-service";
import { useAppStore } from "../../src/stores/app-store";
import { ColorPalette, radii, spacing } from "../../src/theme/tokens";
import { useColors, useGradient } from "../../src/theme/use-colors";
import { TripPreferences } from "../../src/types/domain";

export default function AiWizardScreen() {
  const colors = useColors();
  const gradient = useGradient();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const locale = useAppStore((state) => state.locale);
  const { upsertItinerary, setNotices } = useAppStore((state) => state.actions);

  const itineraryMutation = useMutation({
    mutationFn: (values: TripPreferences) => generateItinerary(values),
    onSuccess: ({ itinerary, warnings }) => {
      upsertItinerary(itinerary);
      setNotices(warnings);
      router.replace(`/itinerary/${itinerary.id}`);
    },
    onError: (error) => {
      const message =
        error instanceof Error
          ? error.message
          : locale === "ko"
          ? "일정 생성에 실패했어요. 잠시 후 다시 시도해 주세요."
          : "Couldn't generate the itinerary. Please try again soon.";
      setNotices([message]);
    },
  });

  const handleClose = useCallback(() => {
    if (itineraryMutation.isPending) return;
    router.back();
  }, [itineraryMutation.isPending]);

  const handleSubmit = useCallback(
    (values: TripPreferences) => {
      itineraryMutation.mutate(values);
    },
    [itineraryMutation]
  );

  return (
    <LinearGradient colors={gradient} style={styles.root}>
      <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <Text style={styles.eyebrow}>
              {locale === "ko" ? "AI 플랜 어시스턴트" : "AI plan assistant"}
            </Text>
            <Text style={styles.title}>
              {locale === "ko" ? "대화로 만드는 부산 여행" : "Chat your way to Busan"}
            </Text>
          </View>
          <Pressable
            onPress={handleClose}
            style={({ pressed }) => [
              styles.closeBtn,
              pressed && styles.closeBtnPressed,
              itineraryMutation.isPending && styles.closeBtnDisabled,
            ]}
            disabled={itineraryMutation.isPending}
          >
            <Feather name="x" size={18} color={colors.cloud} />
          </Pressable>
        </View>

        {itineraryMutation.isPending ? (
          <LoadingAnimation locale={locale} />
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            <WizardContainer
              locale={locale}
              onSubmit={handleSubmit}
              onClose={handleClose}
              isSubmitting={itineraryMutation.isPending}
            />
          </ScrollView>
        )}
      </SafeAreaView>
    </LinearGradient>
  );
}

const makeStyles = (c: ColorPalette) =>
  StyleSheet.create({
    root: { flex: 1 },
    safe: { flex: 1 },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md,
      paddingBottom: spacing.sm,
    },
    headerCopy: { gap: 2 },
    eyebrow: {
      color: c.coral,
      fontSize: 11,
      fontWeight: "800",
      textTransform: "uppercase",
      letterSpacing: 0.8,
    },
    title: { color: c.cloud, fontSize: 20, fontWeight: "800", letterSpacing: -0.2 },
    closeBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: c.glass,
      borderWidth: 1,
      borderColor: c.lineBright,
      alignItems: "center",
      justifyContent: "center",
    },
    closeBtnPressed: { backgroundColor: c.input },
    closeBtnDisabled: { opacity: 0.4 },
    scrollContent: {
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.xxl + 12,
      gap: spacing.md,
    },
  });
