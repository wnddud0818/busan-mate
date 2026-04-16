import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { ReactNode } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { DebugPanel } from "./debug-panel";
import { colors, spacing } from "../../theme/tokens";

interface ScreenProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  scroll?: boolean;
  showBack?: boolean;
}

export const Screen = ({ title, subtitle, children, scroll = true, showBack = false }: ScreenProps) => {
  const content = (
    <View style={styles.content}>
      <View style={styles.header}>
        {showBack ? (
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <Feather name="arrow-left" size={20} color={colors.cloud} />
            <Text style={styles.backLabel}>뒤로</Text>
          </Pressable>
        ) : null}
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      <DebugPanel />
      {children}
    </View>
  );

  return (
    <LinearGradient colors={["#071120", "#0E2438", "#1A3E57"]} style={styles.root}>
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
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  safe: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xxl + 12,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  header: {
    paddingTop: spacing.lg,
    paddingBottom: 4,
    gap: 6,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    marginBottom: spacing.sm,
    paddingVertical: 4,
  },
  backLabel: {
    color: colors.cloud,
    fontSize: 14,
    fontWeight: "600",
  },
  title: {
    color: colors.cloud,
    fontSize: 30,
    fontWeight: "800",
    letterSpacing: -0.6,
  },
  subtitle: {
    color: colors.mist,
    fontSize: 14,
    lineHeight: 22,
    paddingRight: spacing.md,
  },
});
