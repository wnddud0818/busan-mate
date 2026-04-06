import { Pressable, StyleSheet, Text } from "react-native";

import { colors, radii, spacing } from "../../theme/tokens";

export const Pill = ({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) => (
  <Pressable onPress={onPress} style={[styles.pill, selected && styles.selected]}>
    <Text style={[styles.label, selected && styles.selectedLabel]}>{label}</Text>
  </Pressable>
);

const styles = StyleSheet.create({
  pill: {
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  selected: {
    backgroundColor: colors.coral,
    borderColor: colors.coral,
  },
  label: {
    color: colors.cloud,
    fontSize: 14,
    fontWeight: "600",
  },
  selectedLabel: {
    color: colors.navy,
  },
});
