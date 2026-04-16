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
  <Pressable
    onPress={onPress}
    style={({ pressed }) => [
      styles.pill,
      selected && styles.selected,
      pressed && !selected && styles.pressed,
    ]}
  >
    <Text style={[styles.label, selected && styles.selectedLabel]}>{label}</Text>
  </Pressable>
);

const styles = StyleSheet.create({
  pill: {
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  pressed: {
    backgroundColor: "rgba(255,255,255,0.11)",
    borderColor: "rgba(255,255,255,0.22)",
  },
  selected: {
    backgroundColor: colors.coral,
    borderColor: colors.coral,
  },
  label: {
    color: "rgba(248,251,253,0.82)",
    fontSize: 14,
    fontWeight: "600",
  },
  selectedLabel: {
    color: colors.navy,
    fontWeight: "700",
  },
});
