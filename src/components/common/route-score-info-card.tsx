import { StyleSheet, Text, View } from "react-native";

import { AppLocale } from "../../types/domain";
import { radii, spacing } from "../../theme/tokens";
import { useColors } from "../../theme/use-colors";
import { SectionCard } from "./section-card";

type Copy = {
  ko: string;
  en: string;
};

type ScoreFactor = {
  label: Copy;
  detail: Copy;
};

const translate = (copy: Copy, locale: AppLocale) => copy[locale];

const remoteFactors: ScoreFactor[] = [
  {
    label: { ko: "관심사", en: "Interest" },
    detail: {
      ko: "선호 카테고리와 겹칠 때마다 +16",
      en: "+16 for each category that matches your interests",
    },
  },
  {
    label: { ko: "예산 적합도", en: "Budget fit" },
    detail: {
      ko: "예산 단계가 맞으면 +10, 아니면 +4",
      en: "+10 when the price level matches your budget, otherwise +4",
    },
  },
  {
    label: { ko: "접근성", en: "Accessibility" },
    detail: {
      ko: "접근성 배려를 켜면 accessible +18 / 아니면 -16, 끄면 기본 +6",
      en: "With accessibility needs on: accessible +18, otherwise -16. With it off: base +6",
    },
  },
  {
    label: { ko: "날씨", en: "Weather" },
    detail: {
      ko: "맑음은 자연·포토스팟 가점, 비·더위·추위는 실내와 접근성 장소 가점",
      en: "Clear weather boosts nature and photo spots, while rain, heat, and cold favor indoor and accessible places",
    },
  },
  {
    label: { ko: "출발지 거리", en: "Distance from start" },
    detail: {
      ko: "3km 미만 +10, 8km 미만 +5, 그 이상 +1",
      en: "+10 under 3 km, +5 under 8 km, otherwise +1",
    },
  },
  {
    label: { ko: "인기 보정", en: "Popularity" },
    detail: {
      ko: "장소 popularity 값 x 0.3",
      en: "Place popularity value x 0.3",
    },
  },
];

const fallbackFactors: ScoreFactor[] = [
  {
    label: { ko: "관심사", en: "Interest" },
    detail: {
      ko: "선호 카테고리와 겹칠 때마다 +16",
      en: "+16 for each category that matches your interests",
    },
  },
  {
    label: { ko: "접근성", en: "Accessibility" },
    detail: {
      ko: "접근성 배려를 켜면 accessible +24 / 아니면 -18, 끄면 기본 +8",
      en: "With accessibility needs on: accessible +24, otherwise -18. With it off: base +8",
    },
  },
  {
    label: { ko: "실내 대체", en: "Indoor fallback" },
    detail: {
      ko: "실내 fallback을 켜면 indoor +12, outdoor +4",
      en: "When indoor fallback is on: indoor +12, outdoor +4",
    },
  },
  {
    label: { ko: "이동 방식", en: "Mobility mode" },
    detail: {
      ko: "도보 모드는 짧은 체류지 +10, 긴 체류지 +2, 그 외 이동 방식은 +12",
      en: "Walking mode favors shorter stays with +10, longer stays get +2, and other modes get +12",
    },
  },
  {
    label: { ko: "예산 적합도", en: "Budget fit" },
    detail: {
      ko: "예산 단계가 맞으면 +12, 아니면 +5",
      en: "+12 when the price level matches your budget, otherwise +5",
    },
  },
  {
    label: { ko: "동행 보정", en: "Companion fit" },
    detail: {
      ko: "가족은 접근성 장소 +12, 커플은 포토스팟 +10, 그 외 기본 +6",
      en: "Families favor accessible places with +12, couples favor photo spots with +10, and other groups get a base +6",
    },
  },
  {
    label: { ko: "날씨", en: "Weather" },
    detail: {
      ko: "비는 실내 +22, 맑음은 자연·포토스팟 +16, 더위는 실내 +18, 추위는 실내 +15 중심",
      en: "Rain strongly boosts indoor places (+22), clear weather boosts nature and photo spots (+16), heat favors indoor places (+18), and cold favors indoor places (+15)",
    },
  },
  {
    label: { ko: "출발지 거리", en: "Distance from start" },
    detail: {
      ko: "2.5km 미만 +16, 6km 미만 +10, 11km 미만 +5, 그 이상 +1",
      en: "+16 under 2.5 km, +10 under 6 km, +5 under 11 km, otherwise +1",
    },
  },
  {
    label: { ko: "인기 보정", en: "Popularity" },
    detail: {
      ko: "장소 popularity 값 x 0.35",
      en: "Place popularity value x 0.35",
    },
  },
];

export const RouteScoreInfoCard = ({ locale }: { locale: AppLocale }) => {
  const colors = useColors();

  return (
    <SectionCard
      title={locale === "ko" ? "길찾기 선정 스코어" : "Route selection score"}
      hint={
        locale === "ko"
          ? "후보지는 가산점과 감점을 모두 합산해 정렬됩니다. 점수가 높아도 총예산을 넘기면 일부 장소는 제외될 수 있어요."
          : "Candidates are ranked by adding bonuses and penalties together. Even a high-scoring place can still be dropped if it pushes the route over budget."
      }
      variant="highlight"
    >
      <View style={[styles.formulaBox, { backgroundColor: colors.glass, borderColor: colors.line }]}>
        <Text style={[styles.formulaLabel, { color: colors.mist }]}>
          {locale === "ko" ? "기본식" : "Base formula"}
        </Text>
        <Text style={[styles.formulaText, { color: colors.cloud }]}>
          {locale === "ko"
            ? "최종 점수 = 관심사 + 예산 + 접근성 + 날씨 + 거리 + 인기"
            : "Final score = interest + budget + accessibility + weather + distance + popularity"}
        </Text>
        <Text style={[styles.formulaHint, { color: colors.mist }]}>
          {locale === "ko"
            ? "로컬 fallback과 실내 대체 경로는 여기에 실내 대체, 이동 방식, 동행 보정이 추가됩니다."
            : "Local fallback and indoor reroutes add indoor fallback, mobility mode, and companion-fit adjustments on top of this."}
        </Text>
      </View>

      <View style={styles.engineSection}>
        <Text style={[styles.engineTitle, { color: colors.cloud }]}>
          {locale === "ko" ? "Remote AI 기준" : "Remote AI factors"}
        </Text>
        {remoteFactors.map((factor) => (
          <View key={`remote-${factor.label.en}`} style={[styles.factorRow, { borderColor: colors.line }]}>
            <Text style={[styles.factorLabel, { color: colors.cloud }]}>
              {translate(factor.label, locale)}
            </Text>
            <Text style={[styles.factorDetail, { color: colors.mist }]}>
              {translate(factor.detail, locale)}
            </Text>
          </View>
        ))}
      </View>

      <View style={styles.engineSection}>
        <Text style={[styles.engineTitle, { color: colors.cloud }]}>
          {locale === "ko" ? "Local fallback / 실내 대체 기준" : "Local fallback / indoor reroute factors"}
        </Text>
        {fallbackFactors.map((factor) => (
          <View key={`fallback-${factor.label.en}`} style={[styles.factorRow, { borderColor: colors.line }]}>
            <Text style={[styles.factorLabel, { color: colors.cloud }]}>
              {translate(factor.label, locale)}
            </Text>
            <Text style={[styles.factorDetail, { color: colors.mist }]}>
              {translate(factor.detail, locale)}
            </Text>
          </View>
        ))}
      </View>

      <Text style={[styles.footnote, { color: colors.mist }]}>
        {locale === "ko"
          ? "정리하면, 취향과 날씨에 잘 맞고 출발지에서 가깝고 예산에 맞는 장소가 앞쪽으로 올라옵니다. 다만 실제 사용 엔진에 따라 세부 가중치는 조금 달라질 수 있습니다."
          : "In short, places that fit your interests, the weather, your starting area, and your budget rise to the top. The exact weights can vary slightly depending on which planner engine is active."}
      </Text>
    </SectionCard>
  );
};

const styles = StyleSheet.create({
  formulaBox: {
    borderRadius: radii.md,
    borderWidth: 1,
    padding: spacing.md,
    gap: spacing.xs,
  },
  formulaLabel: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  formulaText: {
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 22,
  },
  formulaHint: {
    fontSize: 13,
    lineHeight: 19,
  },
  engineSection: {
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  engineTitle: {
    fontSize: 14,
    fontWeight: "800",
  },
  factorRow: {
    borderTopWidth: 1,
    paddingTop: spacing.sm,
    gap: 4,
  },
  factorLabel: {
    fontSize: 13,
    fontWeight: "700",
  },
  factorDetail: {
    fontSize: 13,
    lineHeight: 19,
  },
  footnote: {
    fontSize: 12,
    lineHeight: 18,
    marginTop: spacing.xs,
  },
});
