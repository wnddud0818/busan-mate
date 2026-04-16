import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useMemo, useRef } from "react";
import { Animated, Easing, Pressable, StyleSheet, Text, View } from "react-native";

import { AppLocale } from "../../types/domain";
import { ColorPalette, radii, spacing } from "../../theme/tokens";
import { useColors } from "../../theme/use-colors";

interface AiPlanHeroProps {
  locale: AppLocale;
  onPress: () => void;
}

export const AiPlanHero = ({ locale, onPress }: AiPlanHeroProps) => {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 700,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 700,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] });
  const gradientColors = [colors.coral, colors.mint] as const;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.pressable, pressed && styles.pressed]}
    >
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}
      >
        <View style={styles.inner}>
          <Animated.View style={[styles.iconBubble, { transform: [{ scale }] }]}>
            <Feather name="zap" size={20} color={colors.coral} />
          </Animated.View>
          <View style={styles.copy}>
            <Text style={styles.eyebrow}>
              {locale === "ko" ? "NEW" : "NEW"}
            </Text>
            <Text style={styles.title}>
              {locale === "ko" ? "AI와 함께 플랜 세우기" : "Plan with AI"}
            </Text>
            <Text style={styles.subtitle}>
              {locale === "ko"
                ? "대화하듯 질문에 답하면, 맞춤 일정을 만들어드려요"
                : "Answer a few quick questions and let AI draft your itinerary"}
            </Text>
          </View>
          <View style={styles.chevron}>
            <Feather name="arrow-right" size={18} color={colors.navy} />
          </View>
        </View>
      </LinearGradient>
    </Pressable>
  );
};

const makeStyles = (c: ColorPalette) =>
  StyleSheet.create({
    pressable: { borderRadius: radii.lg, overflow: "hidden" },
    pressed: { opacity: 0.9 },
    card: {
      borderRadius: radii.lg,
      padding: spacing.lg,
    },
    inner: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
    },
    iconBubble: {
      width: 46,
      height: 46,
      borderRadius: 23,
      backgroundColor: "rgba(255,255,255,0.92)",
      alignItems: "center",
      justifyContent: "center",
    },
    copy: { flex: 1, gap: 3 },
    eyebrow: {
      color: "rgba(11,26,46,0.7)",
      fontSize: 10,
      fontWeight: "800",
      letterSpacing: 1.2,
    },
    title: { color: c.navy, fontSize: 17, fontWeight: "800", letterSpacing: -0.2 },
    subtitle: {
      color: "rgba(11,26,46,0.75)",
      fontSize: 12,
      lineHeight: 17,
      fontWeight: "600",
    },
    chevron: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: "rgba(255,255,255,0.85)",
      alignItems: "center",
      justifyContent: "center",
    },
  });
