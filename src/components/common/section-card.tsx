import { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

import { colors, radii, spacing } from "../../theme/tokens";

export const SectionCard = ({
  title,
  hint,
  children,
}: {
  title?: string;
  hint?: string;
  children: ReactNode;
}) => (
  <View style={styles.card}>
    {title ? <Text style={styles.title}>{title}</Text> : null}
    {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    {children}
  </View>
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  title: {
    color: colors.cloud,
    fontSize: 18,
    fontWeight: "700",
  },
  hint: {
    color: "rgba(248,251,253,0.7)",
    fontSize: 13,
    lineHeight: 18,
  },
});
