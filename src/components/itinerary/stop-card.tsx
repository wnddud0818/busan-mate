import { Feather } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, radii, spacing } from "../../theme/tokens";
import { ItineraryStop } from "../../types/domain";
import { tText } from "../../utils/localized";
import { clockLabel } from "../../utils/time";

export const StopCard = ({
  stop,
  locale,
  onDirections,
  onBooking,
}: {
  stop: ItineraryStop;
  locale: "ko" | "en";
  onDirections: () => void;
  onBooking?: () => void;
}) => (
  <View style={styles.container}>
    {/* 순서 인디케이터 */}
    <View style={styles.orderColumn}>
      <View style={styles.orderBadge}>
        <Text style={styles.orderText}>{stop.order}</Text>
      </View>
    </View>

    {/* 카드 본문 */}
    <View style={styles.card}>
      {/* 시간 */}
      <View style={styles.timeRow}>
        <Feather name="clock" size={11} color={colors.mint} />
        <Text style={styles.time}>
          {clockLabel(stop.startTime)} – {clockLabel(stop.endTime)}
        </Text>
      </View>

      {/* 장소명 */}
      <Text style={styles.title}>{tText(stop.place.name, locale)}</Text>

      {/* 하이라이트 */}
      {stop.highlight ? (
        <Text style={styles.highlight}>{tText(stop.highlight, locale)}</Text>
      ) : null}

      {/* 설명 */}
      <Text style={styles.description}>{tText(stop.place.description, locale)}</Text>

      {/* 이동 정보 */}
      {stop.transitFromPrevious ? (
        <View style={styles.transitRow}>
          <Feather name="navigation" size={11} color={colors.coral} />
          <Text style={styles.transit}>{tText(stop.transitFromPrevious.summary, locale)}</Text>
        </View>
      ) : null}

      {/* 메모 */}
      {stop.note ? <Text style={styles.note}>{tText(stop.note, locale)}</Text> : null}

      {/* 액션 버튼 */}
      <View style={styles.actions}>
        <Pressable onPress={onDirections} style={styles.primaryAction}>
          <Feather name="map-pin" size={12} color={colors.navy} />
          <Text style={styles.primaryActionText}>{locale === "ko" ? "길안내" : "Directions"}</Text>
        </Pressable>
        {stop.place.bookingUrl ? (
          <Pressable onPress={onBooking} style={styles.secondaryAction}>
            <Feather name="external-link" size={12} color={colors.cloud} />
            <Text style={styles.secondaryActionText}>{locale === "ko" ? "예약" : "Booking"}</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  orderColumn: {
    alignItems: "center",
    paddingTop: 14,
    width: 28,
  },
  orderBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.lineBright,
    alignItems: "center",
    justifyContent: "center",
  },
  orderText: {
    color: colors.cloud,
    fontSize: 11,
    fontWeight: "800",
  },
  card: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.md,
    gap: 8,
    marginBottom: spacing.xs,
  },
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  time: {
    color: colors.mint,
    fontSize: 12,
    fontWeight: "700",
  },
  title: {
    color: colors.cloud,
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: -0.2,
  },
  highlight: {
    color: colors.sand,
    fontSize: 12,
    fontWeight: "700",
  },
  description: {
    color: "rgba(248,251,253,0.76)",
    fontSize: 13,
    lineHeight: 20,
  },
  transitRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  transit: {
    color: colors.coral,
    fontSize: 12,
    fontWeight: "600",
    flex: 1,
  },
  note: {
    color: colors.mist,
    fontSize: 12,
    lineHeight: 18,
  },
  actions: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: 2,
  },
  primaryAction: {
    backgroundColor: colors.coral,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  primaryActionText: {
    color: colors.navy,
    fontSize: 13,
    fontWeight: "700",
  },
  secondaryAction: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  secondaryActionText: {
    color: colors.cloud,
    fontSize: 13,
    fontWeight: "700",
  },
});
