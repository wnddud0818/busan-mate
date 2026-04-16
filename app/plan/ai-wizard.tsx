import { Feather } from "@expo/vector-icons";
import { useMutation } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { LoadingAnimation } from "../../src/components/ai-wizard/loading-animation";
import { WizardContainer } from "../../src/components/ai-wizard/wizard-container";
import { generateItinerary } from "../../src/services/itinerary-service";
import { useAppStore } from "../../src/stores/app-store";
import { ColorPalette, radii, spacing } from "../../src/theme/tokens";
import { useColors, useGradient } from "../../src/theme/use-colors";
import { TripPreferences } from "../../src/types/domain";

const screenCopy = {
  ko: {
    eyebrow: "AI plan assistant",
    title: "대화로 만드는 부산여행",
    subtitle: "예산, 날짜, 취향을 주고받으며 부산 코스를 함께 완성해보세요.",
    loadingTitle: "대화로 만드는 부산여행",
    error: "일정 생성에 실패했어요. 잠시 후 다시 시도해주세요.",
  },
  en: {
    eyebrow: "AI plan assistant",
    title: "A Busan trip built through chat",
    subtitle: "Shape the route by chatting through your budget, timing, and travel style.",
    loadingTitle: "A Busan trip built through chat",
    error: "Couldn't generate the itinerary. Please try again soon.",
  },
} as const;

export default function AiWizardScreen() {
  const colors = useColors();
  const gradient = useGradient();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const locale = useAppStore((state) => state.locale);
  const { upsertItinerary, setNotices } = useAppStore((state) => state.actions);
  const copy = screenCopy[locale];

  const headerIntro = useRef(new Animated.Value(0)).current;
  const [submittedPreferences, setSubmittedPreferences] = useState<TripPreferences | null>(null);

  useEffect(() => {
    headerIntro.setValue(0);
    Animated.parallel([
      Animated.timing(headerIntro, {
        toValue: 1,
        duration: 320,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [headerIntro]);

  const itineraryMutation = useMutation({
    mutationFn: (values: TripPreferences) => generateItinerary(values),
    onSuccess: ({ itinerary, warnings }) => {
      upsertItinerary(itinerary);
      setNotices(warnings);
      router.replace(`/itinerary/${itinerary.id}`);
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : copy.error;
      setNotices([message]);
    },
  });

  const handleClose = useCallback(() => {
    if (itineraryMutation.isPending) return;
    router.back();
  }, [itineraryMutation.isPending]);

  const handleSubmit = useCallback(
    (values: TripPreferences) => {
      setSubmittedPreferences(values);
      itineraryMutation.mutate(values);
    },
    [itineraryMutation]
  );

  const headerTranslateY = headerIntro.interpolate({ inputRange: [0, 1], outputRange: [12, 0] });

  return (
    <LinearGradient colors={gradient} style={styles.root}>
      <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
        <View style={styles.header}>
          <Animated.View
            style={[
              styles.headerCopy,
              {
                opacity: headerIntro,
                transform: [{ translateY: headerTranslateY }],
              },
            ]}
          >
            <Text style={styles.eyebrow}>{copy.eyebrow}</Text>
            <Text style={styles.title}>{copy.title}</Text>
            <Text style={styles.subtitle}>{copy.subtitle}</Text>
          </Animated.View>
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
          <LoadingAnimation
            locale={locale}
            title={copy.loadingTitle}
            preferences={submittedPreferences}
          />
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
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: spacing.md,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md,
      paddingBottom: spacing.sm,
    },
    headerCopy: { flex: 1, gap: 4 },
    eyebrow: {
      color: c.coral,
      fontSize: 11,
      fontWeight: "800",
      textTransform: "uppercase",
      letterSpacing: 0.8,
    },
    title: { color: c.cloud, fontSize: 24, fontWeight: "800", letterSpacing: -0.35 },
    subtitle: {
      color: c.mist,
      fontSize: 13,
      lineHeight: 19,
      fontWeight: "600",
      maxWidth: 320,
    },
    closeBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: c.glass,
      borderWidth: 1,
      borderColor: c.lineBright,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 2,
    },
    closeBtnPressed: { backgroundColor: c.input },
    closeBtnDisabled: { opacity: 0.4 },
    scrollContent: {
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.xxl + 12,
      gap: spacing.md,
    },
  });
