import { Feather } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, Pressable, StyleSheet, Text, View } from "react-native";

import { AppLocale } from "../../types/domain";
import { ColorPalette, radii, spacing } from "../../theme/tokens";
import { useColors } from "../../theme/use-colors";

interface AiPlanHeroProps {
  locale: AppLocale;
  onPress: () => void;
}

const heroCopy = {
  ko: {
    idleEyebrow: "NEW",
    idleTitle: "AI와 함께 플랜 세우기",
    idleSubtitle: "몇 가지 질문만 답하면 부산 일정 초안을 바로 시작할 수 있어요",
    launchBadge: "AI CHAT",
    launchTitle: "대화로 만드는 부산여행",
    launchSubtitle: "AI가 곧 예산, 날짜, 취향을 물어보며 일정을 함께 짜드릴게요",
  },
  en: {
    idleEyebrow: "NEW",
    idleTitle: "Plan with AI",
    idleSubtitle: "Answer a few quick prompts and start your Busan route in seconds",
    launchBadge: "AI CHAT",
    launchTitle: "A Busan trip built through chat",
    launchSubtitle: "AI will ask about your budget, timing, and vibe to shape the route",
  },
} as const;

export const AiPlanHero = ({ locale, onPress }: AiPlanHeroProps) => {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const copy = heroCopy[locale];

  const pulse = useRef(new Animated.Value(0)).current;
  const launch = useRef(new Animated.Value(0)).current;
  const launchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isLaunching, setIsLaunching] = useState(false);

  const resetLaunchState = useCallback(() => {
    if (launchTimer.current) {
      clearTimeout(launchTimer.current);
      launchTimer.current = null;
    }
    launch.stopAnimation();
    launch.setValue(0);
    setIsLaunching(false);
  }, [launch]);

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
    return () => {
      loop.stop();
    };
  }, [pulse]);

  useFocusEffect(
    useCallback(() => {
      resetLaunchState();

      return () => {
        if (launchTimer.current) {
          clearTimeout(launchTimer.current);
          launchTimer.current = null;
        }
      };
    }, [resetLaunchState])
  );

  const handlePress = useCallback(() => {
    if (isLaunching) return;

    launch.setValue(0);
    setIsLaunching(true);
    Animated.timing(launch, {
      toValue: 1,
      duration: 340,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();

    launchTimer.current = setTimeout(() => {
      launchTimer.current = null;
      onPress();
    }, 260);
  }, [isLaunching, launch, onPress]);

  const pulseScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] });
  const cardScale = launch.interpolate({ inputRange: [0, 0.65, 1], outputRange: [1, 0.985, 1.015] });
  const contentTranslateY = launch.interpolate({ inputRange: [0, 1], outputRange: [0, -2] });
  const iconLift = launch.interpolate({ inputRange: [0, 1], outputRange: [0, -3] });
  const labelOpacity = launch.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 0.55, 1] });
  const labelTranslateY = launch.interpolate({ inputRange: [0, 1], outputRange: [10, 0] });
  const sheenOpacity = launch.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0, 0.32, 1] });
  const sheenTranslateX = launch.interpolate({ inputRange: [0, 1], outputRange: [-180, 220] });
  const arrowTranslateX = launch.interpolate({ inputRange: [0, 1], outputRange: [0, 5] });
  const arrowOpacity = launch.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });

  const title = isLaunching ? copy.launchTitle : copy.idleTitle;
  const subtitle = isLaunching ? copy.launchSubtitle : copy.idleSubtitle;
  const iconName = isLaunching ? "message-circle" : "zap";
  const gradientColors = [colors.coral, colors.mint] as const;
  const sheenColors = [
    "rgba(255,255,255,0)",
    "rgba(255,255,255,0.65)",
    "rgba(255,255,255,0)",
  ] as const;

  return (
    <Pressable
      onPress={handlePress}
      disabled={isLaunching}
      style={({ pressed }) => [styles.pressable, pressed && !isLaunching && styles.pressed]}
    >
      <Animated.View style={{ transform: [{ scale: cardScale }] }}>
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.card}
        >
          <Animated.View
            pointerEvents="none"
            style={[
              styles.sheen,
              {
                opacity: sheenOpacity,
                transform: [{ translateX: sheenTranslateX }, { rotate: "12deg" }],
              },
            ]}
          >
            <LinearGradient colors={sheenColors} style={styles.sheenFill} />
          </Animated.View>

          <Animated.View
            style={[
              styles.launchBadge,
              {
                opacity: labelOpacity,
                transform: [{ translateY: labelTranslateY }],
              },
            ]}
          >
            <Feather name="message-circle" size={12} color={colors.navy} />
            <Text style={styles.launchBadgeText}>{copy.launchBadge}</Text>
          </Animated.View>

          <Animated.View style={[styles.inner, { transform: [{ translateY: contentTranslateY }] }]}>
            <Animated.View
              style={[
                styles.iconBubble,
                { transform: [{ scale: pulseScale }, { translateY: iconLift }] },
              ]}
            >
              <Feather name={iconName} size={20} color={colors.coral} />
            </Animated.View>

            <View style={styles.copy}>
              <Text style={styles.eyebrow}>
                {isLaunching ? copy.launchBadge : copy.idleEyebrow}
              </Text>
              <Text style={styles.title}>{title}</Text>
              <Text style={styles.subtitle}>{subtitle}</Text>
            </View>

            <Animated.View
              style={[
                styles.chevron,
                {
                  opacity: arrowOpacity,
                  transform: [{ translateX: arrowTranslateX }],
                },
              ]}
            >
              <Feather name="arrow-right" size={18} color={colors.navy} />
            </Animated.View>
          </Animated.View>
        </LinearGradient>
      </Animated.View>
    </Pressable>
  );
};

const makeStyles = (c: ColorPalette) =>
  StyleSheet.create({
    pressable: { borderRadius: radii.lg, overflow: "hidden" },
    pressed: { opacity: 0.92 },
    card: {
      borderRadius: radii.lg,
      padding: spacing.lg,
      overflow: "hidden",
    },
    sheen: {
      position: "absolute",
      top: -34,
      bottom: -34,
      width: 110,
      left: -20,
    },
    sheenFill: { flex: 1 },
    launchBadge: {
      position: "absolute",
      top: 12,
      right: 14,
      zIndex: 2,
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: radii.pill,
      backgroundColor: "rgba(255,255,255,0.82)",
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.6)",
    },
    launchBadgeText: {
      color: c.navy,
      fontSize: 10,
      fontWeight: "800",
      letterSpacing: 0.7,
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
      backgroundColor: "rgba(255,255,255,0.94)",
      alignItems: "center",
      justifyContent: "center",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 10,
      elevation: 2,
    },
    copy: { flex: 1, gap: 3, paddingRight: 8 },
    eyebrow: {
      color: "rgba(11,26,46,0.72)",
      fontSize: 10,
      fontWeight: "800",
      letterSpacing: 1.2,
    },
    title: { color: c.navy, fontSize: 17, fontWeight: "800", letterSpacing: -0.2 },
    subtitle: {
      color: "rgba(11,26,46,0.76)",
      fontSize: 12,
      lineHeight: 17,
      fontWeight: "600",
    },
    chevron: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: "rgba(255,255,255,0.86)",
      alignItems: "center",
      justifyContent: "center",
    },
  });
