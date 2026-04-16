import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { addDays, format } from "date-fns";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Pressable, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { z } from "zod";

import { startAreas } from "../../data/start-areas";
import { tripPreferencesSchema } from "../../features/itinerary/schema";
import { deriveBudgetLevel, makeBudgetLabel } from "../../features/itinerary/planning";
import { fetchWeatherSnapshot } from "../../services/weather-service";
import { AppLocale, InterestTag, TripPreferences } from "../../types/domain";
import { formatKrwCompact } from "../../utils/currency";
import { colors, radii, spacing } from "../../theme/tokens";
import { Pill } from "../common/pill";

const optionLabel = {
  tripDays: {
    "1": { ko: "1일", en: "1 day" },
    "2": { ko: "2일", en: "2 days" },
    "3": { ko: "3일", en: "3 days" },
  },
  companionType: {
    solo: { ko: "혼자", en: "Solo" },
    couple: { ko: "커플", en: "Couple" },
    family: { ko: "가족", en: "Family" },
    friends: { ko: "친구", en: "Friends" },
  },
  budgetLevel: {
    value: { ko: "가성비", en: "Value" },
    balanced: { ko: "밸런스", en: "Balanced" },
    premium: { ko: "프리미엄", en: "Premium" },
  },
  mobilityMode: {
    transit: { ko: "대중교통", en: "Transit" },
    walk: { ko: "도보 위주", en: "Walk-first" },
    mixed: { ko: "혼합", en: "Mixed" },
  },
  interests: {
    food: { ko: "맛집", en: "Food" },
    culture: { ko: "문화", en: "Culture" },
    nature: { ko: "자연", en: "Nature" },
    photospot: { ko: "포토스팟", en: "Photo spots" },
    shopping: { ko: "쇼핑", en: "Shopping" },
    history: { ko: "역사", en: "History" },
    night: { ko: "야경", en: "Night" },
    healing: { ko: "힐링", en: "Healing" },
  },
} as const;

const budgetQuickPicks = [120000, 200000, 300000, 450000];
const partyQuickPicks = [1, 2, 3, 4];
const dateChoices = Array.from({ length: 7 }, (_, index) =>
  format(addDays(new Date(), index), "yyyy-MM-dd")
);

type FormValues = z.infer<typeof tripPreferencesSchema>;

const localized = <T extends keyof typeof optionLabel>(
  group: T,
  key: keyof (typeof optionLabel)[T],
  locale: AppLocale
) => (optionLabel[group][key] as Record<AppLocale, string>)[locale];

const formatDateLabel = (value: string, locale: AppLocale) => {
  const date = new Date(`${value}T00:00:00+09:00`);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return `${month}/${day}`;
};

const numericValue = (text: string) => {
  const digits = text.replace(/\D/g, "");
  return Number(digits || 0);
};

export const TripPreferencesForm = ({
  locale,
  onSubmit,
  isSubmitting,
}: {
  locale: AppLocale;
  onSubmit: (values: TripPreferences) => void;
  isSubmitting: boolean;
}) => {
  const [step, setStep] = useState<1 | 2>(1);
  const { control, handleSubmit, setValue, watch } = useForm<FormValues>({
    resolver: zodResolver(tripPreferencesSchema),
    defaultValues: {
      tripDays: 2,
      totalBudgetKrw: 200000,
      partySize: 2,
      travelDate: format(addDays(new Date(), 1), "yyyy-MM-dd"),
      startAreaId: "seomyeon",
      companionType: "friends",
      interests: ["food", "culture", "night"],
      budgetLevel: "balanced",
      mobilityMode: "mixed",
      accessibilityNeeds: false,
      indoorFallback: true,
      locale,
    },
  });

  const selectedInterests = watch("interests");
  const totalBudgetKrw = watch("totalBudgetKrw");
  const partySize = watch("partySize");
  const tripDays = watch("tripDays");
  const travelDate = watch("travelDate");
  const startAreaId = watch("startAreaId");
  const derivedBudgetLevel = deriveBudgetLevel({ totalBudgetKrw, partySize, tripDays });

  const weatherQuery = useQuery({
    queryKey: ["weather-preview", startAreaId, travelDate],
    queryFn: () => fetchWeatherSnapshot({ startAreaId, travelDate }),
    enabled: Boolean(startAreaId && travelDate),
  });

  const toggleInterest = (interest: InterestTag) => {
    const next = selectedInterests.includes(interest)
      ? selectedInterests.filter((item) => item !== interest)
      : [...selectedInterests, interest];
    setValue("interests", next.length > 0 ? next : [interest]);
  };

  const submitForm = (values: FormValues) =>
    onSubmit({ ...values, locale, budgetLevel: deriveBudgetLevel(values) });

  return (
    <View style={styles.wrapper}>
      {/* ── 스텝 헤더 ── */}
      <View style={styles.stepHeader}>
        <Text style={styles.formTitle}>
          {locale === "ko" ? "예산 우선 플랜" : "Budget-first planning"}
        </Text>
        {/* 진행 바 */}
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, step === 2 && styles.progressFull]} />
        </View>
        <View style={styles.stepRow}>
          {[1, 2].map((n) => (
            <View key={n} style={[styles.stepBadge, step >= n && styles.stepBadgeActive]}>
              <Text style={[styles.stepBadgeText, step >= n && styles.stepBadgeTextActive]}>
                {n}
              </Text>
            </View>
          ))}
          <Text style={styles.stepHint}>
            {step === 1
              ? locale === "ko" ? "예산 · 날짜 · 출발지" : "Budget · Date · Start"
              : locale === "ko" ? "일정 · 관심사 · 이동" : "Duration · Interests · Mobility"}
          </Text>
        </View>
      </View>

      {/* ── 카드 ── */}
      <View style={styles.card}>
        {step === 1 ? (
          <View style={styles.block}>
            {/* 총 예산 */}
            <Controller
              control={control}
              name="totalBudgetKrw"
              render={({ field: { onChange, value } }) => (
                <View style={styles.field}>
                  <Text style={styles.label}>
                    {locale === "ko" ? "총 여행 예산" : "Total trip budget"}
                  </Text>
                  <TextInput
                    nativeID="trip-budget-input"
                    value={value ? String(value) : ""}
                    onChangeText={(text) => onChange(numericValue(text))}
                    style={styles.input}
                    keyboardType="number-pad"
                    placeholder={locale === "ko" ? "예: 200000" : "e.g. 200000"}
                    placeholderTextColor={colors.fog}
                  />
                  <View style={styles.rowWrap}>
                    {budgetQuickPicks.map((budget) => (
                      <Pill
                        key={budget}
                        label={formatKrwCompact(budget, locale)}
                        selected={value === budget}
                        onPress={() => onChange(budget)}
                      />
                    ))}
                  </View>
                </View>
              )}
            />

            {/* 인원수 */}
            <Controller
              control={control}
              name="partySize"
              render={({ field: { onChange, value } }) => (
                <View style={styles.field}>
                  <Text style={styles.label}>
                    {locale === "ko" ? "인원수" : "Party size"}
                  </Text>
                  <TextInput
                    nativeID="trip-party-size-input"
                    value={value ? String(value) : ""}
                    onChangeText={(text) => onChange(Math.max(1, numericValue(text)))}
                    style={styles.input}
                    keyboardType="number-pad"
                    placeholder={locale === "ko" ? "예: 2" : "e.g. 2"}
                    placeholderTextColor={colors.fog}
                  />
                  <View style={styles.rowWrap}>
                    {partyQuickPicks.map((count) => (
                      <Pill
                        key={count}
                        label={locale === "ko" ? `${count}명` : `${count}p`}
                        selected={value === count}
                        onPress={() => onChange(count)}
                      />
                    ))}
                  </View>
                </View>
              )}
            />

            {/* 여행 날짜 */}
            <View style={styles.field}>
              <Text style={styles.label}>
                {locale === "ko" ? "여행 날짜" : "Travel date"}
              </Text>
              <Controller
                control={control}
                name="travelDate"
                render={({ field: { onChange, value } }) => (
                  <>
                    <TextInput
                      nativeID="trip-date-input"
                      value={value}
                      onChangeText={onChange}
                      style={styles.input}
                      placeholder="YYYY-MM-DD"
                      placeholderTextColor={colors.fog}
                    />
                    <View style={styles.rowWrap}>
                      {dateChoices.map((dateValue) => (
                        <Pill
                          key={dateValue}
                          label={formatDateLabel(dateValue, locale)}
                          selected={value === dateValue}
                          onPress={() => onChange(dateValue)}
                        />
                      ))}
                    </View>
                  </>
                )}
              />
            </View>

            {/* 출발 지역 */}
            <View style={styles.field}>
              <Text style={styles.label}>
                {locale === "ko" ? "출발 지역" : "Starting area"}
              </Text>
              <View style={styles.rowWrap}>
                {startAreas.map((area) => (
                  <Pill
                    key={area.id}
                    label={area.name[locale]}
                    selected={startAreaId === area.id}
                    onPress={() => setValue("startAreaId", area.id)}
                  />
                ))}
              </View>
            </View>

            {/* 예산 감도 프리뷰 */}
            <View style={styles.previewCard}>
              <Text style={styles.previewLabel}>
                {locale === "ko" ? "예산 감도" : "Budget level"}
              </Text>
              <Text style={styles.previewValue}>
                {makeBudgetLabel(derivedBudgetLevel)[locale]}
              </Text>
              <Text style={styles.previewHint}>
                {locale === "ko"
                  ? `총 ${formatKrwCompact(totalBudgetKrw, locale)} / ${partySize}명 / ${tripDays}일`
                  : `${formatKrwCompact(totalBudgetKrw, locale)} for ${partySize} pax / ${tripDays} days`}
              </Text>
            </View>

            {/* 날씨 프리뷰 */}
            {weatherQuery.isLoading ? (
              <View style={styles.previewCard}>
                <Text style={styles.previewLabel}>
                  {locale === "ko" ? "날씨 미리보기" : "Weather preview"}
                </Text>
                <Text style={styles.previewHint}>
                  {locale === "ko" ? "예보 불러오는 중..." : "Loading forecast..."}
                </Text>
              </View>
            ) : weatherQuery.data ? (
              <View style={[styles.previewCard, styles.weatherCard]}>
                <Text style={styles.previewLabel}>
                  {locale === "ko" ? "날씨 미리보기" : "Weather preview"}
                </Text>
                <Text style={styles.previewValue}>
                  {weatherQuery.data.summary[locale]}
                </Text>
                {typeof weatherQuery.data.temperatureMaxC === "number" ? (
                  <Text style={styles.previewHint}>
                    {locale === "ko"
                      ? `최고 ${weatherQuery.data.temperatureMaxC}° / 강수 ${weatherQuery.data.precipitationProbabilityMax ?? 0}%`
                      : `High ${weatherQuery.data.temperatureMaxC}° / Rain ${weatherQuery.data.precipitationProbabilityMax ?? 0}%`}
                  </Text>
                ) : null}
              </View>
            ) : null}

            <Pressable onPress={handleSubmit(() => setStep(2))} style={styles.primaryButton}>
              <Text style={styles.primaryButtonText}>
                {locale === "ko" ? "취향 설정으로 →" : "Continue to preferences →"}
              </Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.block}>
            {/* 여행 기간 */}
            <View style={styles.field}>
              <Text style={styles.label}>
                {locale === "ko" ? "여행 기간" : "Trip length"}
              </Text>
              <View style={styles.rowWrap}>
                {[1, 2, 3].map((day) => (
                  <Pill
                    key={day}
                    label={localized(
                      "tripDays",
                      String(day) as keyof typeof optionLabel.tripDays,
                      locale
                    )}
                    selected={tripDays === day}
                    onPress={() => setValue("tripDays", day)}
                  />
                ))}
              </View>
            </View>

            {/* 동행 유형 */}
            <View style={styles.field}>
              <Text style={styles.label}>
                {locale === "ko" ? "동행 유형" : "Companion"}
              </Text>
              <View style={styles.rowWrap}>
                {(["solo", "couple", "family", "friends"] as const).map((value) => (
                  <Pill
                    key={value}
                    label={localized("companionType", value, locale)}
                    selected={watch("companionType") === value}
                    onPress={() => setValue("companionType", value)}
                  />
                ))}
              </View>
            </View>

            {/* 관심사 */}
            <View style={styles.field}>
              <Text style={styles.label}>
                {locale === "ko" ? "관심사" : "Interests"}
              </Text>
              <View style={styles.rowWrap}>
                {(
                  [
                    "food",
                    "culture",
                    "nature",
                    "photospot",
                    "shopping",
                    "history",
                    "night",
                    "healing",
                  ] as const
                ).map((interest) => (
                  <Pill
                    key={interest}
                    label={localized("interests", interest, locale)}
                    selected={selectedInterests.includes(interest)}
                    onPress={() => toggleInterest(interest)}
                  />
                ))}
              </View>
            </View>

            {/* 이동 성향 */}
            <View style={styles.field}>
              <Text style={styles.label}>
                {locale === "ko" ? "이동 성향" : "Mobility"}
              </Text>
              <View style={styles.rowWrap}>
                {(["transit", "walk", "mixed"] as const).map((value) => (
                  <Pill
                    key={value}
                    label={localized("mobilityMode", value, locale)}
                    selected={watch("mobilityMode") === value}
                    onPress={() => setValue("mobilityMode", value)}
                  />
                ))}
              </View>
            </View>

            {/* 무장애 우선 */}
            <Controller
              control={control}
              name="accessibilityNeeds"
              render={({ field: { onChange, value } }) => (
                <View style={styles.switchRow}>
                  <View style={styles.switchCopy}>
                    <Text style={styles.label}>
                      {locale === "ko" ? "무장애 우선" : "Accessibility first"}
                    </Text>
                    <Text style={styles.switchHint}>
                      {locale === "ko"
                        ? "유모차·휠체어 동선이 쉬운 장소를 우선 반영합니다."
                        : "Prioritize wheelchair and stroller-friendly stops."}
                    </Text>
                  </View>
                  <Switch
                    value={value}
                    onValueChange={onChange}
                    trackColor={{ true: colors.coral, false: "rgba(255,255,255,0.14)" }}
                    thumbColor={value ? colors.sand : colors.smoke}
                  />
                </View>
              )}
            />

            {/* 실내 대체 허용 */}
            <Controller
              control={control}
              name="indoorFallback"
              render={({ field: { onChange, value } }) => (
                <View style={styles.switchRow}>
                  <View style={styles.switchCopy}>
                    <Text style={styles.label}>
                      {locale === "ko" ? "실내 대체 허용" : "Indoor fallback"}
                    </Text>
                    <Text style={styles.switchHint}>
                      {locale === "ko"
                        ? "날씨가 바뀌면 실내 비중이 높은 경로로 조정합니다."
                        : "Prepare an indoor reroute when conditions change."}
                    </Text>
                  </View>
                  <Switch
                    value={value}
                    onValueChange={onChange}
                    trackColor={{ true: colors.mint, false: "rgba(255,255,255,0.14)" }}
                    thumbColor={value ? colors.navy : colors.smoke}
                  />
                </View>
              )}
            />

            {/* 액션 버튼 */}
            <View style={styles.actionRow}>
              <Pressable onPress={() => setStep(1)} style={styles.backButton}>
                <Text style={styles.backButtonText}>
                  {locale === "ko" ? "← 이전" : "← Back"}
                </Text>
              </Pressable>
              <Pressable
                onPress={handleSubmit(submitForm)}
                style={[styles.primaryButton, styles.flex1, isSubmitting && styles.disabled]}
                disabled={isSubmitting}
              >
                <Text style={styles.primaryButtonText}>
                  {isSubmitting
                    ? locale === "ko" ? "생성 중..." : "Generating..."
                    : locale === "ko" ? "AI 일정 생성" : "Generate itinerary"}
                </Text>
              </Pressable>
            </View>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    gap: spacing.sm,
  },
  stepHeader: {
    gap: spacing.sm,
    paddingHorizontal: 2,
  },
  formTitle: {
    color: colors.cloud,
    fontSize: 17,
    fontWeight: "800",
    letterSpacing: -0.2,
  },
  progressTrack: {
    height: 3,
    backgroundColor: "rgba(255,255,255,0.10)",
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    width: "50%",
    height: "100%",
    backgroundColor: colors.coral,
    borderRadius: 2,
  },
  progressFull: {
    width: "100%",
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  stepBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  stepBadgeActive: {
    backgroundColor: colors.coral,
    borderColor: colors.coral,
  },
  stepBadgeText: {
    color: colors.mist,
    fontSize: 11,
    fontWeight: "800",
  },
  stepBadgeTextActive: {
    color: colors.navy,
  },
  stepHint: {
    color: colors.mist,
    fontSize: 12,
    fontWeight: "600",
  },
  card: {
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.lg,
  },
  block: {
    gap: spacing.md,
  },
  rowWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  label: {
    color: colors.cloud,
    fontSize: 14,
    fontWeight: "700",
  },
  field: {
    gap: spacing.sm,
  },
  input: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.line,
    color: colors.cloud,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: 15,
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    paddingVertical: spacing.xs,
  },
  switchCopy: {
    flex: 1,
    gap: 4,
  },
  switchHint: {
    color: colors.mist,
    fontSize: 12,
    lineHeight: 18,
  },
  previewCard: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.md,
    gap: 5,
  },
  weatherCard: {
    backgroundColor: colors.mintLight,
    borderColor: colors.mintBorder,
  },
  previewLabel: {
    color: colors.mint,
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  previewValue: {
    color: colors.cloud,
    fontSize: 15,
    fontWeight: "800",
    lineHeight: 22,
  },
  previewHint: {
    color: colors.mist,
    fontSize: 12,
    lineHeight: 18,
  },
  actionRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  backButton: {
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.line,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  backButtonText: {
    color: colors.cloud,
    fontWeight: "700",
    fontSize: 14,
  },
  primaryButton: {
    marginTop: spacing.xs,
    backgroundColor: colors.coral,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    alignItems: "center",
  },
  primaryButtonText: {
    color: colors.navy,
    fontSize: 15,
    fontWeight: "800",
  },
  flex1: {
    flex: 1,
    marginTop: 0,
  },
  disabled: {
    opacity: 0.6,
  },
});
