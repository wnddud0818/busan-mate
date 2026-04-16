import { Feather } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { RouteScoreInfoCard } from "../src/components/common/route-score-info-card";
import { Screen } from "../src/components/common/screen";
import { SectionCard } from "../src/components/common/section-card";
import { useAppStore } from "../src/stores/app-store";
import { radii, spacing } from "../src/theme/tokens";
import { useColors } from "../src/theme/use-colors";

export default function SettingsPage() {
  const colors = useColors();
  const locale = useAppStore((state) => state.locale);
  const colorScheme = useAppStore((state) => state.colorScheme);
  const { setLocale, setColorScheme } = useAppStore((state) => state.actions);

  return (
    <Screen title={locale === "ko" ? "설정" : "Settings"} showBack>
      <SectionCard title={locale === "ko" ? "언어" : "Language"}>
        <View style={styles.row}>
          {(["ko", "en"] as const).map((lang) => {
            const selected = locale === lang;
            return (
              <Pressable
                key={lang}
                style={[
                  styles.optionBtn,
                  {
                    backgroundColor: selected ? colors.coral : colors.glass,
                    borderColor: selected ? colors.coral : colors.line,
                  },
                ]}
                onPress={() => setLocale(lang)}
              >
                <Text style={styles.flag}>{lang === "ko" ? "🇰🇷" : "🇺🇸"}</Text>
                <Text style={[styles.optionLabel, { color: selected ? colors.navy : colors.cloud }]}>
                  {lang === "ko" ? "한국어" : "English"}
                </Text>
                {selected ? <Feather name="check" size={14} color={colors.navy} /> : null}
              </Pressable>
            );
          })}
        </View>
      </SectionCard>

      <SectionCard title={locale === "ko" ? "테마" : "Theme"}>
        <View style={styles.row}>
          {(["light", "dark"] as const).map((scheme) => {
            const selected = colorScheme === scheme;
            return (
              <Pressable
                key={scheme}
                style={[
                  styles.optionBtn,
                  {
                    backgroundColor: selected ? colors.mint : colors.glass,
                    borderColor: selected ? colors.mint : colors.line,
                  },
                ]}
                onPress={() => setColorScheme(scheme)}
              >
                <Feather
                  name={scheme === "light" ? "sun" : "moon"}
                  size={16}
                  color={selected ? colors.navy : colors.cloud}
                />
                <Text style={[styles.optionLabel, { color: selected ? colors.navy : colors.cloud }]}>
                  {scheme === "light"
                    ? locale === "ko" ? "라이트" : "Light"
                    : locale === "ko" ? "다크" : "Dark"}
                </Text>
                {selected ? <Feather name="check" size={14} color={colors.navy} /> : null}
              </Pressable>
            );
          })}
        </View>
      </SectionCard>

      <RouteScoreInfoCard locale={locale} />

      <SectionCard title={locale === "ko" ? "앱 정보" : "About"}>
        <View style={styles.infoRow}>
          <Text style={[styles.infoLabel, { color: colors.mist }]}>
            {locale === "ko" ? "버전" : "Version"}
          </Text>
          <Text style={[styles.infoValue, { color: colors.cloud }]}>1.0.0</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={[styles.infoLabel, { color: colors.mist }]}>Busan Mate</Text>
          <Text style={[styles.infoValue, { color: colors.mist }]}>
            {locale === "ko" ? "AI 부산 여행 플래너" : "AI Busan travel planner"}
          </Text>
        </View>
      </SectionCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  optionBtn: {
    flex: 1,
    borderRadius: radii.md,
    borderWidth: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    alignItems: "center",
    gap: 6,
  },
  flag: {
    fontSize: 22,
  },
  optionLabel: {
    fontSize: 14,
    fontWeight: "700",
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
  },
  infoLabel: {
    fontSize: 14,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: "600",
  },
});
