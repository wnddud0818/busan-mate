import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { ComponentProps, useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";

import { startAreasById } from "../../data/start-areas";
import { AppLocale, InterestTag, TripPreferences } from "../../types/domain";
import { ColorPalette, radii, spacing } from "../../theme/tokens";
import { useColors } from "../../theme/use-colors";
import { formatKrwCompact } from "../../utils/currency";

const HALO_ROTATION_DURATION = 12000;
const FLOAT_DURATION = 2800;
const SCAN_DURATION = 2200;
const STATUS_INTERVAL = 1600;

type FeatherIconName = ComponentProps<typeof Feather>["name"];
type ChipTone = "coral" | "mint" | "sand";

interface FloatingChip {
  icon: FeatherIconName;
  label: string;
  tone: ChipTone;
}

interface RouteRow {
  icon: FeatherIconName;
  width: `${number}%`;
  tone: ChipTone;
}

interface SummaryStat {
  icon: FeatherIconName;
  label: string;
  value: string;
  tone: ChipTone;
}

interface SummaryBadge {
  label: string;
  tone: ChipTone;
}

interface LoadingSummary {
  floatingChips: FloatingChip[];
  stats: SummaryStat[];
  interests: SummaryBadge[];
  options: SummaryBadge[];
}

const statusLines: Record<AppLocale, string[]> = {
  ko: [
    "취향에 맞는 장소들을 먼저 고르고 있어요",
    "이동 시간이 덜 아까운 동선으로 다듬는 중이에요",
    "날씨와 예산까지 함께 맞춰보고 있어요",
    "거의 다 왔어요. 마지막 조합을 정리하는 중이에요",
  ],
  en: [
    "Picking spots that match your vibe",
    "Refining a smoother route between stops",
    "Balancing weather, timing, and budget",
    "Almost there. Wrapping up the final mix",
  ],
};

const defaultFloatingChips: Record<AppLocale, FloatingChip[]> = {
  ko: [
    { icon: "coffee", label: "맛집", tone: "coral" },
    { icon: "navigation", label: "동선", tone: "mint" },
    { icon: "cloud", label: "날씨", tone: "sand" },
  ],
  en: [
    { icon: "coffee", label: "Food", tone: "coral" },
    { icon: "navigation", label: "Route", tone: "mint" },
    { icon: "cloud", label: "Weather", tone: "sand" },
  ],
};

const routeRows: RouteRow[] = [
  { icon: "map-pin", width: "84%", tone: "coral" },
  { icon: "navigation", width: "64%", tone: "mint" },
  { icon: "moon", width: "76%", tone: "sand" },
];

const interestMeta: Record<
  InterestTag,
  { ko: string; en: string; tone: ChipTone }
> = {
  food: { ko: "맛집", en: "Food", tone: "coral" },
  culture: { ko: "문화", en: "Culture", tone: "mint" },
  nature: { ko: "자연", en: "Nature", tone: "mint" },
  photospot: { ko: "포토", en: "Photo", tone: "sand" },
  shopping: { ko: "쇼핑", en: "Shopping", tone: "coral" },
  history: { ko: "역사", en: "History", tone: "sand" },
  night: { ko: "야경", en: "Night", tone: "coral" },
  healing: { ko: "힐링", en: "Healing", tone: "mint" },
};

const companionLabels = {
  solo: { ko: "혼자", en: "Solo" },
  couple: { ko: "커플", en: "Couple" },
  family: { ko: "가족", en: "Family" },
  friends: { ko: "친구", en: "Friends" },
} as const;

const mobilityMeta = {
  transit: { ko: "대중교통 위주", en: "Transit-first", tone: "mint" as ChipTone },
  walk: { ko: "도보 위주", en: "Walk-first", tone: "sand" as ChipTone },
  mixed: { ko: "이동 혼합", en: "Mixed route", tone: "coral" as ChipTone },
  car: { ko: "차량 이동", en: "Car route", tone: "coral" as ChipTone },
} as const;

const uiCopy = {
  ko: {
    eyebrow: "BUSAN MATE AI",
    title: "AI가 여행을 그리는 중이에요",
    cardBadge: "맞춤 루트 초안",
    cardLabel: "부산에 맞는 첫 번째 조합을 정리하고 있어요",
    summaryEyebrow: "TRIP SNAPSHOT",
    summaryTitle: "입력한 여행 조건",
    interestLabel: "취향",
    optionLabel: "이동·옵션",
    budgetLabel: "예산",
    partyLabel: "인원",
    dateLabel: "일정",
    startLabel: "출발",
    accessibilityLabel: "무장애 우선",
    indoorLabel: "실내 대안",
    lodgingLabel: "숙소 포함",
    partyUnit: "명",
    dayUnit: "일",
  },
  en: {
    eyebrow: "BUSAN MATE AI",
    title: "Drafting your itinerary",
    cardBadge: "Custom route draft",
    cardLabel: "Building the first Busan route that fits you",
    summaryEyebrow: "TRIP SNAPSHOT",
    summaryTitle: "Your travel inputs",
    interestLabel: "Interests",
    optionLabel: "Mobility & options",
    budgetLabel: "Budget",
    partyLabel: "Group",
    dateLabel: "Dates",
    startLabel: "Start",
    accessibilityLabel: "Accessibility first",
    indoorLabel: "Indoor fallback",
    lodgingLabel: "Include lodging",
    partyUnit: "pax",
    dayUnit: "day",
  },
} as const;

const withAlpha = (hexColor: string, alpha: number) => {
  if (!hexColor.startsWith("#")) return hexColor;

  const hex = hexColor.slice(1);
  const normalized =
    hex.length === 3
      ? hex
          .split("")
          .map((value) => value + value)
          .join("")
      : hex;

  const red = parseInt(normalized.slice(0, 2), 16);
  const green = parseInt(normalized.slice(2, 4), 16);
  const blue = parseInt(normalized.slice(4, 6), 16);

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
};

const resolveTone = (colors: ColorPalette, tone: ChipTone) => {
  switch (tone) {
    case "coral":
      return {
        bg: colors.coralLight,
        border: colors.coralBorder,
        icon: colors.coral,
        fill: withAlpha(colors.coral, 0.3),
      };
    case "mint":
      return {
        bg: colors.mintLight,
        border: colors.mintBorder,
        icon: colors.mint,
        fill: withAlpha(colors.mint, 0.3),
      };
    case "sand":
      return {
        bg: colors.sandLight,
        border: withAlpha(colors.sand, 0.28),
        icon: colors.sand,
        fill: withAlpha(colors.sand, 0.28),
      };
    default:
      return {
        bg: colors.glass,
        border: colors.line,
        icon: colors.cloud,
        fill: colors.lineBright,
      };
  }
};

const formatDateLabel = (isoDate: string, locale: AppLocale) => {
  const date = new Date(`${isoDate}T00:00:00+09:00`);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const weekdayKo = ["일", "월", "화", "수", "목", "금", "토"][date.getDay()];
  const weekdayEn = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][date.getDay()];

  return locale === "ko" ? `${month}/${day} (${weekdayKo})` : `${month}/${day} ${weekdayEn}`;
};

const formatDateChip = (isoDate: string) => {
  const date = new Date(`${isoDate}T00:00:00+09:00`);
  return `${date.getMonth() + 1}/${date.getDate()}`;
};

const buildLoadingSummary = (
  preferences: TripPreferences,
  locale: AppLocale
): LoadingSummary => {
  const copy = uiCopy[locale];
  const startArea = startAreasById[preferences.startAreaId];
  const companion = companionLabels[preferences.companionType][locale];
  const mobility = mobilityMeta[preferences.mobilityMode];
  const interestBadges = preferences.interests.slice(0, 4).map((tag) => ({
    label: interestMeta[tag][locale],
    tone: interestMeta[tag].tone,
  }));

  const options: SummaryBadge[] = [
    { label: mobility[locale], tone: mobility.tone },
  ];

  if (preferences.accessibilityNeeds) {
    options.push({ label: copy.accessibilityLabel, tone: "coral" });
  }

  if (preferences.indoorFallback) {
    options.push({ label: copy.indoorLabel, tone: "mint" });
  }

  if (preferences.includeLodgingCost) {
    options.push({ label: copy.lodgingLabel, tone: "sand" });
  }

  const dayLabel =
    locale === "ko"
      ? `${preferences.tripDays}${copy.dayUnit}`
      : `${preferences.tripDays} ${preferences.tripDays > 1 ? "days" : copy.dayUnit}`;
  const partyLabel =
    locale === "ko"
      ? `${preferences.partySize}${copy.partyUnit} · ${companion}`
      : `${preferences.partySize} ${copy.partyUnit} · ${companion}`;

  return {
    floatingChips: [
      {
        icon: "dollar-sign",
        label: formatKrwCompact(preferences.totalBudgetKrw, locale),
        tone: "coral",
      },
      {
        icon: "users",
        label: locale === "ko" ? `${preferences.partySize}명 · ${dayLabel}` : `${preferences.partySize} pax · ${dayLabel}`,
        tone: "mint",
      },
      {
        icon: "calendar",
        label: formatDateChip(preferences.travelDate),
        tone: "sand",
      },
    ],
    stats: [
      {
        icon: "dollar-sign",
        label: copy.budgetLabel,
        value: formatKrwCompact(preferences.totalBudgetKrw, locale),
        tone: "coral",
      },
      {
        icon: "users",
        label: copy.partyLabel,
        value: partyLabel,
        tone: "mint",
      },
      {
        icon: "calendar",
        label: copy.dateLabel,
        value: `${formatDateLabel(preferences.travelDate, locale)} · ${dayLabel}`,
        tone: "sand",
      },
      {
        icon: "map-pin",
        label: copy.startLabel,
        value: startArea?.name[locale] ?? "-",
        tone: "coral",
      },
    ],
    interests: interestBadges,
    options,
  };
};

interface LoadingAnimationProps {
  locale: AppLocale;
  title?: string;
  preferences?: TripPreferences | null;
}

export const LoadingAnimation = ({ locale, title, preferences }: LoadingAnimationProps) => {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const halo = useRef(new Animated.Value(0)).current;
  const floating = useRef(new Animated.Value(0)).current;
  const scan = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(1)).current;
  const [statusIndex, setStatusIndex] = useState(0);

  const lines = statusLines[locale];
  const copy = uiCopy[locale];
  const summary = useMemo(
    () => (preferences ? buildLoadingSummary(preferences, locale) : null),
    [locale, preferences]
  );
  const chips = summary?.floatingChips ?? defaultFloatingChips[locale];

  useEffect(() => {
    const haloLoop = Animated.loop(
      Animated.timing(halo, {
        toValue: 1,
        duration: HALO_ROTATION_DURATION,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );

    const floatLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(floating, {
          toValue: 1,
          duration: FLOAT_DURATION / 2,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(floating, {
          toValue: 0,
          duration: FLOAT_DURATION / 2,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );

    const scanLoop = Animated.loop(
      Animated.timing(scan, {
        toValue: 1,
        duration: SCAN_DURATION,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );

    haloLoop.start();
    floatLoop.start();
    scanLoop.start();

    return () => {
      haloLoop.stop();
      floatLoop.stop();
      scanLoop.stop();
    };
  }, [floating, halo, scan]);

  useEffect(() => {
    const timer = setInterval(() => {
      Animated.timing(textOpacity, {
        toValue: 0,
        duration: 180,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }).start(() => {
        setStatusIndex((value) => (value + 1) % lines.length);
        Animated.timing(textOpacity, {
          toValue: 1,
          duration: 220,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }).start();
      });
    }, STATUS_INTERVAL);

    return () => clearInterval(timer);
  }, [lines.length, textOpacity]);

  const haloRotate = halo.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });
  const haloCounterRotate = halo.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "-360deg"],
  });

  const floatUp = floating.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [6, -8, 6],
  });
  const cardScale = floating.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.985, 1, 0.985],
  });
  const ambientScaleA = floating.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.96, 1.05, 0.96],
  });
  const ambientScaleB = floating.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1.05, 0.96, 1.05],
  });
  const summaryLift = floating.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [6, 0, 6],
  });

  const scanTranslate = scan.interpolate({
    inputRange: [0, 1],
    outputRange: [-140, 220],
  });
  const progressTranslate = scan.interpolate({
    inputRange: [0, 1],
    outputRange: [-90, 150],
  });

  const ambientGradientA = [withAlpha(colors.coral, 0.24), withAlpha(colors.coral, 0)] as const;
  const ambientGradientB = [withAlpha(colors.mint, 0.24), withAlpha(colors.mint, 0)] as const;
  const cardGradient = [withAlpha(colors.surface, 0.98), colors.surfaceHigh] as const;
  const summaryGradient = [
    withAlpha(colors.surface, 0.9),
    withAlpha(colors.surfaceHigh, 0.92),
  ] as const;
  const scanGradient = [
    withAlpha(colors.cloud, 0),
    withAlpha(colors.cloud, 0.28),
    withAlpha(colors.cloud, 0),
  ] as const;
  const progressGradient = [
    withAlpha(colors.mint, 0),
    withAlpha(colors.mint, 0.65),
    withAlpha(colors.coral, 0.75),
    withAlpha(colors.coral, 0),
  ] as const;

  return (
    <View style={styles.container}>
      <View style={styles.stage}>
        <Animated.View
          style={[styles.ambient, styles.ambientA, { transform: [{ scale: ambientScaleA }] }]}
        >
          <LinearGradient
            colors={ambientGradientA}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.ambientFill}
          />
        </Animated.View>
        <Animated.View
          style={[styles.ambient, styles.ambientB, { transform: [{ scale: ambientScaleB }] }]}
        >
          <LinearGradient
            colors={ambientGradientB}
            start={{ x: 1, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={styles.ambientFill}
          />
        </Animated.View>

        <Animated.View style={[styles.halo, { transform: [{ rotate: haloRotate }] }]}>
          <View style={styles.haloRing} />
        </Animated.View>
        <Animated.View
          style={[styles.haloSecondary, { transform: [{ rotate: haloCounterRotate }] }]}
        >
          <View style={styles.haloRingSecondary} />
        </Animated.View>

        {chips.map((chip, index) => {
          const tone = resolveTone(colors, chip.tone);
          const translateY = floating.interpolate({
            inputRange: [0, 0.5, 1],
            outputRange:
              index === 0 ? [0, -10, 0] : index === 1 ? [0, 8, 0] : [0, -6, 0],
          });
          const rotate = floating.interpolate({
            inputRange: [0, 0.5, 1],
            outputRange:
              index === 0
                ? ["-2deg", "2deg", "-2deg"]
                : index === 1
                  ? ["2deg", "-1deg", "2deg"]
                  : ["0deg", "2deg", "0deg"],
          });

          return (
            <Animated.View
              key={`${chip.icon}-${chip.label}`}
              style={[
                styles.chip,
                index === 0
                  ? styles.chipTopLeft
                  : index === 1
                    ? styles.chipTopRight
                    : styles.chipBottomLeft,
                {
                  transform: [{ translateY }, { rotate }],
                },
              ]}
            >
              <View
                style={[
                  styles.chipIconWrap,
                  { backgroundColor: tone.bg, borderColor: tone.border },
                ]}
              >
                <Feather name={chip.icon} size={13} color={tone.icon} />
              </View>
              <Text style={styles.chipLabel}>{chip.label}</Text>
            </Animated.View>
          );
        })}

        <Animated.View
          style={[
            styles.cardShell,
            {
              transform: [{ translateY: floatUp }, { scale: cardScale }],
            },
          ]}
        >
          <LinearGradient colors={cardGradient} style={styles.card}>
            <LinearGradient
              colors={[withAlpha(colors.cloud, 0.14), withAlpha(colors.cloud, 0)]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.cardSheen}
            />

            <View style={styles.cardHeader}>
              <View style={styles.cardBadge}>
                <Feather name="cpu" size={12} color={colors.mint} />
                <Text style={styles.cardBadgeText}>{copy.cardBadge}</Text>
              </View>
              <View style={styles.cardDots}>
                <View style={[styles.cardDot, { backgroundColor: colors.coral }]} />
                <View style={[styles.cardDot, { backgroundColor: colors.sand }]} />
                <View style={[styles.cardDot, { backgroundColor: colors.mint }]} />
              </View>
            </View>

            <View style={styles.routeList}>
              {routeRows.map((row, index) => {
                const tone = resolveTone(colors, row.tone);
                const rowOpacity = floating.interpolate({
                  inputRange: [0, 0.5, 1],
                  outputRange:
                    index === 0 ? [0.72, 1, 0.72] : index === 1 ? [0.48, 0.9, 0.48] : [0.62, 0.94, 0.62],
                });

                return (
                  <View key={`${row.icon}-${row.width}`} style={styles.routeRow}>
                    <View
                      style={[
                        styles.routeIconWrap,
                        { backgroundColor: tone.bg, borderColor: tone.border },
                      ]}
                    >
                      <Feather name={row.icon} size={12} color={tone.icon} />
                    </View>
                    <View style={styles.routeBarTrack}>
                      <Animated.View
                        style={[
                          styles.routeBarFill,
                          {
                            width: row.width,
                            backgroundColor: tone.fill,
                            opacity: rowOpacity,
                          },
                        ]}
                      />
                    </View>
                  </View>
                );
              })}
            </View>

            <View style={styles.cardFooter}>
              <Text style={styles.cardLabel}>{copy.cardLabel}</Text>
              <View style={styles.progressTrack}>
                <Animated.View
                  style={[
                    styles.progressGlow,
                    { transform: [{ translateX: progressTranslate }] },
                  ]}
                >
                  <LinearGradient
                    colors={progressGradient}
                    style={styles.progressFill}
                    start={{ x: 0, y: 0.5 }}
                    end={{ x: 1, y: 0.5 }}
                  />
                </Animated.View>
              </View>
            </View>

            <Animated.View
              pointerEvents="none"
              style={[styles.scanLine, { transform: [{ translateX: scanTranslate }] }]}
            >
              <LinearGradient
                colors={scanGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.scanFill}
              />
            </Animated.View>
          </LinearGradient>
        </Animated.View>
      </View>

      <View style={styles.copy}>
        <Text style={styles.eyebrow}>{copy.eyebrow}</Text>
        <Text style={styles.title}>{title ?? copy.title}</Text>
        <Animated.Text style={[styles.status, { opacity: textOpacity }]}>
          {lines[statusIndex]}
        </Animated.Text>
        <View style={styles.statusDots}>
          {lines.map((line, index) => (
            <View
              key={line}
              style={[styles.statusDot, index === statusIndex && styles.statusDotActive]}
            />
          ))}
        </View>
      </View>

      {summary ? (
        <Animated.View
          style={[styles.summaryShell, { transform: [{ translateY: summaryLift }] }]}
        >
          <LinearGradient
            colors={summaryGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.summaryPanel}
          >
            <View style={styles.summaryHeader}>
              <Text style={styles.summaryEyebrow}>{copy.summaryEyebrow}</Text>
              <Text style={styles.summaryTitle}>{copy.summaryTitle}</Text>
            </View>

            <View style={styles.statGrid}>
              {summary.stats.map((stat) => {
                const tone = resolveTone(colors, stat.tone);
                return (
                  <View key={stat.label} style={styles.statCard}>
                    <View
                      style={[
                        styles.statIconWrap,
                        { backgroundColor: tone.bg, borderColor: tone.border },
                      ]}
                    >
                      <Feather name={stat.icon} size={13} color={tone.icon} />
                    </View>
                    <Text style={styles.statLabel}>{stat.label}</Text>
                    <Text style={styles.statValue}>{stat.value}</Text>
                  </View>
                );
              })}
            </View>

            <View style={styles.summarySection}>
              <Text style={styles.summarySectionLabel}>{copy.interestLabel}</Text>
              <View style={styles.badgeRow}>
                {summary.interests.map((badge) => {
                  const tone = resolveTone(colors, badge.tone);
                  return (
                    <View
                      key={`${copy.interestLabel}-${badge.label}`}
                      style={[
                        styles.badge,
                        { backgroundColor: tone.bg, borderColor: tone.border },
                      ]}
                    >
                      <Text style={[styles.badgeText, { color: tone.icon }]}>{badge.label}</Text>
                    </View>
                  );
                })}
              </View>
            </View>

            <View style={styles.summarySection}>
              <Text style={styles.summarySectionLabel}>{copy.optionLabel}</Text>
              <View style={styles.badgeRow}>
                {summary.options.map((badge) => {
                  const tone = resolveTone(colors, badge.tone);
                  return (
                    <View
                      key={`${copy.optionLabel}-${badge.label}`}
                      style={[
                        styles.badge,
                        { backgroundColor: tone.bg, borderColor: tone.border },
                      ]}
                    >
                      <Text style={[styles.badgeText, { color: tone.icon }]}>{badge.label}</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          </LinearGradient>
        </Animated.View>
      ) : null}
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
      paddingVertical: spacing.xl,
      gap: spacing.lg,
    },
    stage: {
      width: "100%",
      maxWidth: 320,
      height: 300,
      alignItems: "center",
      justifyContent: "center",
    },
    ambient: {
      position: "absolute",
      width: 216,
      height: 216,
      borderRadius: 108,
      opacity: 0.96,
    },
    ambientA: {
      left: 10,
      top: 24,
    },
    ambientB: {
      right: 0,
      bottom: 12,
    },
    ambientFill: {
      flex: 1,
      borderRadius: 108,
    },
    halo: {
      position: "absolute",
      width: 268,
      height: 268,
      alignItems: "center",
      justifyContent: "center",
    },
    haloSecondary: {
      position: "absolute",
      width: 224,
      height: 224,
      alignItems: "center",
      justifyContent: "center",
    },
    haloRing: {
      width: "100%",
      height: "100%",
      borderRadius: 999,
      borderWidth: 1,
      borderColor: c.lineBright,
      borderStyle: "dashed",
      opacity: 0.65,
    },
    haloRingSecondary: {
      width: "100%",
      height: "100%",
      borderRadius: 999,
      borderWidth: 1,
      borderColor: c.mintBorder,
      borderStyle: "dashed",
      opacity: 0.75,
    },
    chip: {
      position: "absolute",
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingHorizontal: spacing.sm,
      paddingVertical: 10,
      borderRadius: radii.pill,
      backgroundColor: withAlpha(c.surface, 0.92),
      borderWidth: 1,
      borderColor: c.line,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.12,
      shadowRadius: 20,
      elevation: 4,
    },
    chipTopLeft: {
      left: 4,
      top: 40,
    },
    chipTopRight: {
      right: 0,
      top: 72,
    },
    chipBottomLeft: {
      left: 22,
      bottom: 28,
    },
    chipIconWrap: {
      width: 24,
      height: 24,
      borderRadius: 12,
      borderWidth: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    chipLabel: {
      color: c.cloud,
      fontSize: 12,
      fontWeight: "700",
    },
    cardShell: {
      width: 218,
      height: 182,
      borderRadius: 30,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 18 },
      shadowOpacity: 0.16,
      shadowRadius: 26,
      elevation: 8,
    },
    card: {
      flex: 1,
      borderRadius: 30,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: c.line,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
      justifyContent: "space-between",
      backgroundColor: c.surface,
    },
    cardSheen: {
      ...StyleSheet.absoluteFillObject,
      borderRadius: 30,
    },
    cardHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: spacing.sm,
    },
    cardBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 7,
      borderRadius: radii.pill,
      backgroundColor: c.glass,
      borderWidth: 1,
      borderColor: c.line,
      maxWidth: 150,
    },
    cardBadgeText: {
      color: c.cloud,
      fontSize: 10,
      fontWeight: "800",
      letterSpacing: 0.5,
      textTransform: "uppercase",
      flexShrink: 1,
    },
    cardDots: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
    },
    cardDot: {
      width: 7,
      height: 7,
      borderRadius: 999,
    },
    routeList: {
      gap: spacing.sm,
      paddingTop: spacing.xs,
    },
    routeRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    routeIconWrap: {
      width: 30,
      height: 30,
      borderRadius: 15,
      borderWidth: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    routeBarTrack: {
      flex: 1,
      height: 12,
      borderRadius: radii.pill,
      backgroundColor: c.glass,
      overflow: "hidden",
    },
    routeBarFill: {
      height: "100%",
      borderRadius: radii.pill,
    },
    cardFooter: {
      gap: 10,
    },
    cardLabel: {
      color: c.mist,
      fontSize: 12,
      lineHeight: 18,
      fontWeight: "700",
    },
    progressTrack: {
      height: 7,
      borderRadius: radii.pill,
      backgroundColor: c.glass,
      overflow: "hidden",
    },
    progressGlow: {
      position: "absolute",
      top: 0,
      bottom: 0,
      width: 84,
    },
    progressFill: {
      flex: 1,
    },
    scanLine: {
      position: "absolute",
      top: -36,
      bottom: -36,
      width: 104,
      opacity: 0.85,
    },
    scanFill: {
      flex: 1,
      transform: [{ rotate: "12deg" }],
    },
    copy: {
      width: "100%",
      maxWidth: 320,
      alignItems: "center",
      gap: spacing.sm,
    },
    eyebrow: {
      color: c.coral,
      fontSize: 11,
      fontWeight: "800",
      letterSpacing: 1.1,
      textTransform: "uppercase",
    },
    title: {
      color: c.cloud,
      fontSize: 24,
      lineHeight: 30,
      fontWeight: "800",
      textAlign: "center",
      letterSpacing: -0.4,
    },
    status: {
      color: c.mist,
      fontSize: 15,
      lineHeight: 22,
      fontWeight: "600",
      textAlign: "center",
      minHeight: 44,
      maxWidth: 280,
    },
    statusDots: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingTop: 2,
    },
    statusDot: {
      width: 8,
      height: 8,
      borderRadius: 999,
      backgroundColor: c.lineBright,
    },
    statusDotActive: {
      width: 22,
      backgroundColor: c.coral,
    },
    summaryShell: {
      width: "100%",
      maxWidth: 340,
    },
    summaryPanel: {
      borderRadius: 28,
      borderWidth: 1,
      borderColor: c.line,
      padding: spacing.md,
      gap: spacing.md,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.12,
      shadowRadius: 24,
      elevation: 5,
    },
    summaryHeader: {
      gap: 4,
    },
    summaryEyebrow: {
      color: c.coral,
      fontSize: 11,
      fontWeight: "800",
      letterSpacing: 1,
      textTransform: "uppercase",
    },
    summaryTitle: {
      color: c.cloud,
      fontSize: 18,
      fontWeight: "800",
      letterSpacing: -0.2,
    },
    statGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.sm,
    },
    statCard: {
      flexGrow: 1,
      flexBasis: "47%",
      minWidth: 132,
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: c.line,
      backgroundColor: withAlpha(c.surface, 0.68),
      padding: spacing.sm,
      gap: 6,
    },
    statIconWrap: {
      width: 26,
      height: 26,
      borderRadius: 13,
      borderWidth: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    statLabel: {
      color: c.mist,
      fontSize: 11,
      fontWeight: "700",
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    statValue: {
      color: c.cloud,
      fontSize: 14,
      lineHeight: 20,
      fontWeight: "800",
    },
    summarySection: {
      gap: spacing.xs,
    },
    summarySectionLabel: {
      color: c.mist,
      fontSize: 11,
      fontWeight: "800",
      letterSpacing: 0.5,
      textTransform: "uppercase",
    },
    badgeRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.xs,
    },
    badge: {
      paddingHorizontal: 10,
      paddingVertical: 8,
      borderRadius: radii.pill,
      borderWidth: 1,
      maxWidth: "100%",
    },
    badgeText: {
      fontSize: 12,
      fontWeight: "800",
    },
  });
