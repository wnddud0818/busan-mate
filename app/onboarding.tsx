import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { useAppStore } from "../src/stores/app-store";
import { ColorPalette, radii, spacing } from "../src/theme/tokens";
import { useColors, useGradient } from "../src/theme/use-colors";

const FEATURES = [
  {
    icon: "map" as const,
    ko: "AI가 예산·날씨·관심사를 반영해 1분 안에 부산 맞춤 일정을 생성해요.",
    en: "AI crafts a Busan itinerary in under a minute, tuned to your budget, weather, and interests.",
  },
  {
    icon: "navigation" as const,
    ko: "실시간 위치 가이드로 이동 방법과 예약 링크까지 즉시 안내해요.",
    en: "Live location guidance with on-the-spot directions and booking links.",
  },
  {
    icon: "trending-up" as const,
    ko: "지금 핫한 부산 코스를 Hot Now 랭킹으로 한눈에 확인하세요.",
    en: "Discover today's hottest Busan routes on the Hot Now ranking.",
  },
];

const makeStyles = (c: ColorPalette) =>
  StyleSheet.create({
    root: { flex: 1 },
    safe: { flex: 1 },
    scroll: {
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.xxl + 8,
      gap: spacing.xl,
    },
    hero: { alignItems: "center", paddingTop: spacing.xxl + 8, gap: spacing.md },
    logoBox: { width: 76, height: 76, borderRadius: 22, alignItems: "center", justifyContent: "center", marginBottom: spacing.xs },
    appName: { color: c.coral, fontSize: 14, fontWeight: "800", letterSpacing: 3, textTransform: "uppercase" },
    heroTitle: { color: c.cloud, fontSize: 26, fontWeight: "900", letterSpacing: -0.6, textAlign: "center", lineHeight: 34 },
    heroSub: { color: c.mist, fontSize: 15, textAlign: "center", lineHeight: 23, paddingHorizontal: spacing.md },
    section: { gap: spacing.md },
    sectionLabel: { color: c.fog, fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 1.2 },
    langRow: { flexDirection: "row", gap: spacing.sm },
    langButton: {
      flex: 1, paddingVertical: spacing.md, borderRadius: radii.md, borderWidth: 1,
      borderColor: c.line, backgroundColor: c.glass,
      alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 8,
    },
    langSelected: { backgroundColor: c.coral, borderColor: c.coral },
    langFlag: { fontSize: 22 },
    langText: { color: c.mist, fontWeight: "700", fontSize: 15 },
    langTextSelected: { color: c.navy },
    featureRow: { flexDirection: "row", gap: spacing.md, alignItems: "flex-start" },
    featureIcon: {
      width: 38, height: 38, borderRadius: radii.sm,
      backgroundColor: c.coralLight, borderWidth: 1, borderColor: c.coralBorder,
      alignItems: "center", justifyContent: "center", flexShrink: 0,
    },
    featureCopy: { color: c.mist, fontSize: 14, lineHeight: 21, flex: 1 },
    cta: {
      backgroundColor: c.coral, borderRadius: radii.md,
      paddingVertical: spacing.lg, flexDirection: "row",
      alignItems: "center", justifyContent: "center", gap: spacing.sm,
    },
    ctaPressed: { opacity: 0.88 },
    ctaText: { color: c.navy, fontSize: 17, fontWeight: "900", letterSpacing: -0.2 },
  });

export default function OnboardingPage() {
  const colors = useColors();
  const gradient = useGradient();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const locale = useAppStore((state) => state.locale);
  const { completeOnboarding, setLocale } = useAppStore((state) => state.actions);
  const { t } = useTranslation();

  return (
    <LinearGradient colors={gradient} style={styles.root}>
      <SafeAreaView style={styles.safe}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── 히어로 섹션 ── */}
          <View style={styles.hero}>
            <LinearGradient
              colors={[colors.coral, "#C03010"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.logoBox}
            >
              <Feather name="anchor" size={34} color="white" />
            </LinearGradient>
            <Text style={styles.appName}>Busan Mate</Text>
            <Text style={styles.heroTitle}>{t("onboarding.title")}</Text>
            <Text style={styles.heroSub}>{t("onboarding.subtitle")}</Text>
          </View>

          {/* ── 언어 선택 ── */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>{t("onboarding.language")}</Text>
            <View style={styles.langRow}>
              {(["ko", "en"] as const).map((value) => (
                <Pressable
                  key={value}
                  onPress={() => setLocale(value)}
                  style={[styles.langButton, locale === value && styles.langSelected]}
                >
                  <Text style={styles.langFlag}>{value === "ko" ? "🇰🇷" : "🇺🇸"}</Text>
                  <Text style={[styles.langText, locale === value && styles.langTextSelected]}>
                    {value === "ko" ? "한국어" : "English"}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* ── 핵심 기능 ── */}
          <View style={styles.section}>
            {FEATURES.map((feature) => (
              <View key={feature.icon} style={styles.featureRow}>
                <View style={styles.featureIcon}>
                  <Feather name={feature.icon} size={18} color={colors.coral} />
                </View>
                <Text style={styles.featureCopy}>
                  {locale === "ko" ? feature.ko : feature.en}
                </Text>
              </View>
            ))}
          </View>

          {/* ── CTA ── */}
          <Pressable
            style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}
            onPress={() => {
              completeOnboarding();
              router.replace("/(tabs)/plan");
            }}
          >
            <Text style={styles.ctaText}>{t("onboarding.start")}</Text>
            <Feather name="arrow-right" size={18} color={colors.navy} />
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}
