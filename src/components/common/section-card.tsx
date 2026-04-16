import { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

import { colors, radii, spacing } from "../../theme/tokens";

type CardVariant = "default" | "featured" | "highlight" | "warning";

const variantConfig: Record<
  CardVariant,
  { background: string; borderColor: string; titleColor: string }
> = {
  default: {
    background: "rgba(255,255,255,0.07)",
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
    background: "rgba(255,200,87,0.10)",
    borderColor: "rgba(255,200,87,0.28)",
    titleColor: colors.warning,
  },
};

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
  const cfg = variantConfig[variant];

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: cfg.background, borderColor: cfg.borderColor },
      ]}
    >
      {title ? (
        <Text style={[styles.title, { color: cfg.titleColor }]}>{title}</Text>
      ) : null}
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
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
    color: colors.mist,
    fontSize: 13,
    lineHeight: 19,
  },
});
