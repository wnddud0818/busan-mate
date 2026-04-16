import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { ReactNode, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { DebugPanel } from "./debug-panel";
import { RouteScoreInfoCard } from "./route-score-info-card";
import { useAppStore } from "../../stores/app-store";
import { radii, spacing } from "../../theme/tokens";
import { useColors, useGradient } from "../../theme/use-colors";

interface ScreenProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  scroll?: boolean;
  showBack?: boolean;
}

export const Screen = ({ title, subtitle, children, scroll = true, showBack = false }: ScreenProps) => {
  const colors = useColors();
  const gradient = useGradient();
  const [settingsOpen, setSettingsOpen] = useState(false);

  const locale = useAppStore((state) => state.locale);
  const colorScheme = useAppStore((state) => state.colorScheme);
  const { setLocale, setColorScheme } = useAppStore((state) => state.actions);

  const content = (
    <View style={styles.content}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          {showBack ? (
            <Pressable style={styles.backButton} onPress={() => router.back()}>
              <Feather name="arrow-left" size={20} color={colors.cloud} />
              <Text style={[styles.backLabel, { color: colors.cloud }]}>
                {locale === "ko" ? "뒤로" : "Back"}
              </Text>
            </Pressable>
          ) : (
            <View />
          )}
          <Pressable
            style={[
              styles.themeToggle,
              {
                backgroundColor: settingsOpen ? colors.coral : colors.glass,
                borderColor: settingsOpen ? colors.coral : colors.lineBright,
              },
            ]}
            onPress={() => setSettingsOpen((value) => !value)}
          >
            <Feather name="settings" size={15} color={settingsOpen ? colors.navy : colors.cloud} />
          </Pressable>
        </View>
        <Text style={[styles.title, { color: colors.cloud }]}>{title}</Text>
        {subtitle ? <Text style={[styles.subtitle, { color: colors.mist }]}>{subtitle}</Text> : null}
      </View>
      <DebugPanel />
      {children}
    </View>
  );

  return (
    <>
      <LinearGradient colors={gradient} style={styles.root}>
        <SafeAreaView style={styles.safe}>
          {scroll ? (
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
            >
              {content}
            </ScrollView>
          ) : (
            content
          )}
        </SafeAreaView>
      </LinearGradient>

      <Modal
        visible={settingsOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setSettingsOpen(false)}
      >
        <TouchableWithoutFeedback onPress={() => setSettingsOpen(false)}>
          <View style={styles.backdrop}>
            <TouchableWithoutFeedback>
              <View style={[styles.sheet, { backgroundColor: colors.surface, borderColor: colors.lineBright }]}>
                <View style={styles.sheetHeader}>
                  <Text style={[styles.sheetTitle, { color: colors.cloud }]}>
                    {locale === "ko" ? "설정" : "Settings"}
                  </Text>
                  <Pressable
                    onPress={() => setSettingsOpen(false)}
                    style={[styles.closeBtn, { backgroundColor: colors.glass, borderColor: colors.line }]}
                  >
                    <Feather name="x" size={16} color={colors.cloud} />
                  </Pressable>
                </View>

                <ScrollView
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.sheetScrollContent}
                >
                  <View style={styles.section}>
                    <Text style={[styles.sectionLabel, { color: colors.mist }]}>
                      {locale === "ko" ? "언어" : "Language"}
                    </Text>
                    <View style={styles.optionRow}>
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
                            <Text style={styles.optionFlag}>{lang === "ko" ? "🇰🇷" : "🇺🇸"}</Text>
                            <Text style={[styles.optionLabel, { color: selected ? colors.navy : colors.cloud }]}>
                              {lang === "ko" ? "한국어" : "English"}
                            </Text>
                            {selected ? <Feather name="check" size={13} color={colors.navy} /> : null}
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>

                  <View style={styles.section}>
                    <Text style={[styles.sectionLabel, { color: colors.mist }]}>
                      {locale === "ko" ? "테마" : "Theme"}
                    </Text>
                    <View style={styles.optionRow}>
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
                            {selected ? <Feather name="check" size={13} color={colors.navy} /> : null}
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>

                  <View style={styles.section}>
                    <Text style={[styles.sectionLabel, { color: colors.mist }]}>
                      {locale === "ko" ? "길찾기 점수" : "Route scoring"}
                    </Text>
                    <RouteScoreInfoCard locale={locale} />
                  </View>
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  scrollContent: { paddingBottom: spacing.xxl + 12 },
  content: { flex: 1, paddingHorizontal: spacing.lg, gap: spacing.md },
  header: { paddingTop: spacing.lg, paddingBottom: 4, gap: 6 },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  backButton: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 4 },
  backLabel: { fontSize: 14, fontWeight: "600" },
  themeToggle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: 30, fontWeight: "800", letterSpacing: -0.6 },
  subtitle: { fontSize: 14, lineHeight: 22, paddingRight: spacing.md },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.40)",
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
    maxHeight: "84%",
  },
  sheetScrollContent: { gap: spacing.lg },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sheetTitle: { fontSize: 18, fontWeight: "800" },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  section: { gap: spacing.sm },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  optionRow: { flexDirection: "row", gap: spacing.sm },
  optionBtn: {
    flex: 1,
    borderRadius: radii.md,
    borderWidth: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    alignItems: "center",
    gap: 6,
  },
  optionFlag: { fontSize: 22 },
  optionLabel: { fontSize: 14, fontWeight: "700" },
});
