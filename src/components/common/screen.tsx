import { LinearGradient } from "expo-linear-gradient";
import { ReactNode } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { DebugPanel } from "./debug-panel";
import { colors, spacing } from "../../theme/tokens";

interface ScreenProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  scroll?: boolean;
}

export const Screen = ({ title, subtitle, children, scroll = true }: ScreenProps) => {
  const content = (
    <View style={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      <DebugPanel />
      {children}
    </View>
  );

  return (
    <LinearGradient colors={["#08141E", "#102635", "#173447"]} style={styles.root}>
      <SafeAreaView style={styles.safe}>
        {scroll ? (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
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
    paddingBottom: spacing.xxl,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  header: {
    paddingTop: spacing.md,
    gap: spacing.sm,
  },
  title: {
    color: colors.cloud,
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: -0.4,
  },
  subtitle: {
    color: "rgba(248,251,253,0.78)",
    fontSize: 15,
    lineHeight: 22,
    paddingRight: spacing.md,
  },
});
