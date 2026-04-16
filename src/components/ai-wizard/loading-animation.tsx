import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";

import { AppLocale } from "../../types/domain";
import { ColorPalette, radii, spacing } from "../../theme/tokens";
import { useColors } from "../../theme/use-colors";

const ORBIT_RADIUS = 60;
const ORBIT_DURATION = 2400;
const PULSE_DURATION = 1400;
const STATUS_INTERVAL = 1200;

const statusLines: Record<AppLocale, string[]> = {
  ko: [
    "맛집을 찾고 있어요…",
    "최적 동선을 계산 중…",
    "날씨 예보를 확인해요…",
    "예산에 맞춰 조율 중…",
  ],
  en: [
    "Scouting restaurants…",
    "Optimising the route…",
    "Checking the weather…",
    "Balancing the budget…",
  ],
};

const PIN_OFFSETS = [0, 120, 240]; // degrees

interface LoadingAnimationProps {
  locale: AppLocale;
  title?: string;
}

export const LoadingAnimation = ({ locale, title }: LoadingAnimationProps) => {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const orbit = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;
  const gradientA = useRef(new Animated.Value(1)).current;
  const gradientB = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(1)).current;

  const [statusIndex, setStatusIndex] = useState(0);
  const lines = statusLines[locale];

  useEffect(() => {
    const orbitLoop = Animated.loop(
      Animated.timing(orbit, {
        toValue: 1,
        duration: ORBIT_DURATION,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );

    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: PULSE_DURATION / 2,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: PULSE_DURATION / 2,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );

    const gradientLoop = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(gradientA, {
            toValue: 0,
            duration: 1500,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(gradientB, {
            toValue: 1,
            duration: 1500,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(gradientA, {
            toValue: 1,
            duration: 1500,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(gradientB, {
            toValue: 0,
            duration: 1500,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
        ]),
      ])
    );

    orbitLoop.start();
    pulseLoop.start();
    gradientLoop.start();

    return () => {
      orbitLoop.stop();
      pulseLoop.stop();
      gradientLoop.stop();
    };
  }, [orbit, pulse, gradientA, gradientB]);

  useEffect(() => {
    const timer = setInterval(() => {
      Animated.timing(textOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => {
        setStatusIndex((i) => (i + 1) % lines.length);
        Animated.timing(textOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }).start();
      });
    }, STATUS_INTERVAL);
    return () => clearInterval(timer);
  }, [lines.length, textOpacity]);

  const pulseScale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.08],
  });

  const gradientAColors = [colors.coral, colors.mint] as const;
  const gradientBColors = [colors.mint, colors.navy] as const;

  return (
    <View style={styles.container}>
      <View style={styles.stage}>
        <Animated.View style={[styles.gradientLayer, { opacity: gradientA }]}>
          <LinearGradient colors={gradientAColors} style={styles.gradient} />
        </Animated.View>
        <Animated.View style={[styles.gradientLayer, { opacity: gradientB }]}>
          <LinearGradient colors={gradientBColors} style={styles.gradient} />
        </Animated.View>

        <View style={styles.orbitWrap}>
          {PIN_OFFSETS.map((offset, idx) => {
            const rotate = orbit.interpolate({
              inputRange: [0, 1],
              outputRange: [`${offset}deg`, `${offset + 360}deg`],
            });
            const counter = orbit.interpolate({
              inputRange: [0, 1],
              outputRange: [`-${offset}deg`, `-${offset + 360}deg`],
            });
            return (
              <Animated.View
                key={idx}
                style={[
                  styles.pinContainer,
                  {
                    transform: [
                      { rotate },
                      { translateY: -ORBIT_RADIUS },
                      { rotate: counter },
                    ],
                  },
                ]}
              >
                <View style={styles.pin}>
                  <Feather name="map-pin" size={16} color={colors.coral} />
                </View>
              </Animated.View>
            );
          })}

          <Animated.View style={[styles.core, { transform: [{ scale: pulseScale }] }]}>
            <Feather name="compass" size={28} color={colors.navy} />
          </Animated.View>
        </View>
      </View>

      <View style={styles.copy}>
        <Text style={styles.title}>
          {title ?? (locale === "ko" ? "AI가 여행을 그리는 중이에요" : "Drafting your itinerary")}
        </Text>
        <Animated.Text style={[styles.status, { opacity: textOpacity }]}>
          {lines[statusIndex]}
        </Animated.Text>
      </View>
    </View>
  );
};

const makeStyles = (c: ColorPalette) =>
  StyleSheet.create({
    container: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: spacing.xl,
      gap: spacing.xl,
    },
    stage: {
      width: 220,
      height: 220,
      alignItems: "center",
      justifyContent: "center",
    },
    gradientLayer: {
      ...StyleSheet.absoluteFillObject,
      borderRadius: 110,
      overflow: "hidden",
    },
    gradient: { flex: 1 },
    orbitWrap: {
      width: 200,
      height: 200,
      alignItems: "center",
      justifyContent: "center",
    },
    pinContainer: {
      position: "absolute",
      alignItems: "center",
      justifyContent: "center",
    },
    pin: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: c.surface,
      alignItems: "center",
      justifyContent: "center",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.18,
      shadowRadius: 4,
      elevation: 3,
    },
    core: {
      width: 68,
      height: 68,
      borderRadius: 34,
      backgroundColor: c.sand,
      alignItems: "center",
      justifyContent: "center",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.24,
      shadowRadius: 6,
      elevation: 5,
    },
    copy: { alignItems: "center", gap: spacing.xs },
    title: { color: c.cloud, fontSize: 20, fontWeight: "800", letterSpacing: -0.2 },
    status: { color: c.mist, fontSize: 14, fontWeight: "600" },
  });
