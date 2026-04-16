import { Pressable, StyleSheet, Text } from "react-native";

import { radii, spacing } from "../../theme/tokens";
import { useColors } from "../../theme/use-colors";

export const Pill = ({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) => {
  const colors = useColors();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.pill,
        { borderColor: colors.lineBright, backgroundColor: colors.glass },
        selected && { backgroundColor: colors.coral, borderColor: colors.coral },
        pressed && !selected && { backgroundColor: colors.input, borderColor: colors.lineBright },
      ]}
    >
      <Text
        style={[
          styles.label,
          { color: colors.mist },
          selected && { color: colors.navy, fontWeight: "700" },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  pill: {
    borderRadius: radii.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
  },
});
