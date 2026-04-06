import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";

import { Screen } from "../src/components/common/screen";
import { SectionCard } from "../src/components/common/section-card";
import { useAppStore } from "../src/stores/app-store";
import { colors, radii, spacing } from "../src/theme/tokens";

export default function OnboardingPage() {
  const locale = useAppStore((state) => state.locale);
  const { completeOnboarding, setLocale } = useAppStore((state) => state.actions);
  const { t } = useTranslation();

  return (
    <Screen title={t("onboarding.title")} subtitle={t("onboarding.subtitle")}>
      <SectionCard title={t("onboarding.language")}>
        <View style={styles.languageRow}>
          {(["ko", "en"] as const).map((value) => (
            <Pressable
              key={value}
              onPress={() => setLocale(value)}
              style={[styles.languageButton, locale === value && styles.languageSelected]}
            >
              <Text style={[styles.languageText, locale === value && styles.languageTextSelected]}>
                {value === "ko" ? "한국어" : "English"}
              </Text>
            </Pressable>
          ))}
        </View>
      </SectionCard>

      <SectionCard title="MVP">
        <Text style={styles.bullet}>AI itinerary generation with transit and booking links</Text>
        <Text style={styles.bullet}>Live guide with location-based prompts and rerouting</Text>
        <Text style={styles.bullet}>Hot Now ranking seeded for day-one traction</Text>
      </SectionCard>

      <Pressable
        style={styles.primary}
        onPress={() => {
          completeOnboarding();
          router.replace("/(tabs)/plan");
        }}
      >
        <Text style={styles.primaryText}>{t("onboarding.start")}</Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  languageRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  languageButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: "rgba(255,255,255,0.06)",
    alignItems: "center",
  },
  languageSelected: {
    backgroundColor: colors.sand,
    borderColor: colors.sand,
  },
  languageText: {
    color: colors.cloud,
    fontWeight: "700",
  },
  languageTextSelected: {
    color: colors.navy,
  },
  bullet: {
    color: "rgba(248,251,253,0.82)",
    fontSize: 14,
    lineHeight: 22,
  },
  primary: {
    backgroundColor: colors.coral,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    alignItems: "center",
  },
  primaryText: {
    color: colors.navy,
    fontWeight: "800",
    fontSize: 16,
  },
});
