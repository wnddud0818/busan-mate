import { useMemo } from "react";
import { StyleSheet, Switch, Text, View } from "react-native";

import { ColorPalette, radii, spacing } from "../../theme/tokens";
import { useColors } from "../../theme/use-colors";

interface SwitchRowProps {
  label: string;
  hint: string;
  value: boolean;
  onChange: (next: boolean) => void;
  accent?: "coral" | "mint";
}

export const SwitchRow = ({ label, hint, value, onChange, accent = "coral" }: SwitchRowProps) => {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const trackOn = accent === "coral" ? colors.coral : colors.mint;
  const thumbOn = accent === "coral" ? colors.sand : colors.navy;

  return (
    <View style={styles.row}>
      <View style={styles.copy}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.hint}>{hint}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ true: trackOn, false: colors.lineBright }}
        thumbColor={value ? thumbOn : colors.smoke}
      />
    </View>
  );
};

const makeStyles = (c: ColorPalette) =>
  StyleSheet.create({
    row: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: spacing.md,
      paddingVertical: spacing.xs,
      paddingHorizontal: spacing.sm,
      borderRadius: radii.md,
      backgroundColor: c.glass,
    },
    copy: { flex: 1, gap: 4 },
    label: { color: c.cloud, fontSize: 14, fontWeight: "700" },
    hint: { color: c.mist, fontSize: 12, lineHeight: 17 },
  });
