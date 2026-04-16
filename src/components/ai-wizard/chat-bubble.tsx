import { ReactNode, useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

import { ColorPalette, radii, spacing } from "../../theme/tokens";
import { useColors } from "../../theme/use-colors";

export type ChatBubbleVariant = "assistant" | "user";

interface ChatBubbleProps {
  variant?: ChatBubbleVariant;
  children: ReactNode;
  tone?: "default" | "greeting";
}

export const ChatBubble = ({ variant = "assistant", children, tone = "default" }: ChatBubbleProps) => {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const isAssistant = variant === "assistant";
  const bubbleStyle = isAssistant
    ? tone === "greeting"
      ? [styles.bubble, styles.assistantGreeting]
      : [styles.bubble, styles.assistant]
    : [styles.bubble, styles.user];
  const textStyle = isAssistant
    ? tone === "greeting"
      ? [styles.text, styles.assistantGreetingText]
      : [styles.text, styles.assistantText]
    : [styles.text, styles.userText];

  return (
    <View style={[styles.row, isAssistant ? styles.rowLeft : styles.rowRight]}>
      <View style={bubbleStyle}>
        {typeof children === "string" ? <Text style={textStyle}>{children}</Text> : children}
      </View>
    </View>
  );
};

const makeStyles = (c: ColorPalette) =>
  StyleSheet.create({
    row: { flexDirection: "row", width: "100%" },
    rowLeft: { justifyContent: "flex-start" },
    rowRight: { justifyContent: "flex-end" },
    bubble: {
      maxWidth: "88%",
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm + 2,
      borderRadius: radii.lg,
      borderWidth: 1,
    },
    assistant: {
      backgroundColor: c.surface,
      borderColor: c.line,
      borderTopLeftRadius: radii.sm,
    },
    assistantGreeting: {
      backgroundColor: c.mintLight,
      borderColor: c.mintBorder,
      borderTopLeftRadius: radii.sm,
    },
    user: {
      backgroundColor: c.coral,
      borderColor: c.coral,
      borderTopRightRadius: radii.sm,
    },
    text: { fontSize: 15, lineHeight: 22, fontWeight: "600" },
    assistantText: { color: c.cloud },
    assistantGreetingText: { color: c.cloud, fontWeight: "700" },
    userText: { color: c.navy, fontWeight: "700" },
  });
