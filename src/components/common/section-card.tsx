import { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

import { radii, spacing } from "../../theme/tokens";
import { useColors } from "../../theme/use-colors";

type CardVariant = "default" | "featured" | "highlight" | "warning";

export const SectionCard = ({
  title,
  hint,
  children,
  variant = "default",
}: {
  title?: string;
  hint?: string;
  children: ReactNode;
  variant?: CardVariant;
}) => {
  const colors = useColors();

  const variantConfig: Record<CardVariant, { background: string; borderColor: string; titleColor: string }> = {
    default: {
      background: colors.surface,
      borderColor: colors.line,
      titleColor: colors.cloud,
    },
    featured: {
      background: colors.coralLight,
      borderColor: colors.coralBorder,
      titleColor: colors.coral,
    },
    highlight: {
      background: colors.mintLight,
      borderColor: colors.mintBorder,
      titleColor: colors.mint,
    },
    warning: {
      background: colors.sandLight,
      borderColor: colors.coralBorder,
      titleColor: colors.warning,
    },
  };

  const cfg = variantConfig[variant];

  return (
    <View style={[styles.card, { backgroundColor: cfg.background, borderColor: cfg.borderColor }]}>
      {title ? <Text style={[styles.title, { color: cfg.titleColor }]}>{title}</Text> : null}
      {hint ? <Text style={[styles.hint, { color: colors.mist }]}>{hint}</Text> : null}
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.lg,
    borderWidth: 1,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  hint: {
    fontSize: 13,
    lineHeight: 19,
  },
});
