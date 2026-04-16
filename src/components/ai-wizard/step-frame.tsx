import { ReactNode, useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

import { ColorPalette, radii, spacing } from "../../theme/tokens";
import { useColors } from "../../theme/use-colors";
import { ChatBubble } from "./chat-bubble";

interface StepFrameProps {
  prompt: string;
  greeting?: string;
  summaryChips?: string[];
  children: ReactNode;
  helper?: string | null;
  helperTone?: "neutral" | "warning";
}

export const StepFrame = ({
  prompt,
  greeting,
  summaryChips,
  children,
  helper,
  helperTone = "neutral",
}: StepFrameProps) => {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  return (
    <View style={styles.wrapper}>
      {greeting ? (
        <ChatBubble variant="assistant" tone="greeting">
          {greeting}
        </ChatBubble>
      ) : null}

      {summaryChips && summaryChips.length > 0 ? (
        <View style={styles.chipsRow}>
          {summaryChips.map((chip, index) => (
            <View key={`${chip}-${index}`} style={styles.chip}>
              <Text style={styles.chipText}>{chip}</Text>
            </View>
          ))}
        </View>
      ) : null}

      <ChatBubble variant="assistant">{prompt}</ChatBubble>

      <View style={styles.body}>{children}</View>

      {helper ? (
        <Text style={[styles.helper, helperTone === "warning" && styles.helperWarning]}>
          {helper}
        </Text>
      ) : null}
    </View>
  );
};

const makeStyles = (c: ColorPalette) =>
  StyleSheet.create({
    wrapper: { gap: spacing.md },
    chipsRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 6,
      paddingHorizontal: 2,
    },
    chip: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: radii.pill,
      backgroundColor: c.coralLight,
      borderWidth: 1,
      borderColor: c.coralBorder,
    },
    chipText: { color: c.coral, fontSize: 11, fontWeight: "800", letterSpacing: 0.2 },
    body: { gap: spacing.md, paddingTop: spacing.xs },
    helper: { color: c.mist, fontSize: 12, lineHeight: 17, paddingHorizontal: 2 },
    helperWarning: { color: c.error, fontWeight: "700" },
  });
