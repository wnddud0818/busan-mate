import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { Pressable, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { z } from "zod";

import { tripPreferencesSchema } from "../../features/itinerary/schema";
import { AppLocale, InterestTag, TripPreferences } from "../../types/domain";
import { colors, radii, spacing } from "../../theme/tokens";
import { Pill } from "../common/pill";
import { SectionCard } from "../common/section-card";

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
    nature: { ko: "바다/자연", en: "Nature" },
    photospot: { ko: "포토스팟", en: "Photo spots" },
    shopping: { ko: "쇼핑", en: "Shopping" },
    history: { ko: "역사", en: "History" },
    night: { ko: "야경", en: "Night" },
    healing: { ko: "힐링", en: "Healing" },
  },
} as const;

type FormValues = z.infer<typeof tripPreferencesSchema>;

const localized = <T extends keyof typeof optionLabel>(
  group: T,
  key: keyof (typeof optionLabel)[T],
  locale: AppLocale
) => (optionLabel[group][key] as Record<AppLocale, string>)[locale];

export const TripPreferencesForm = ({
  locale,
  onSubmit,
  isSubmitting,
}: {
  locale: AppLocale;
  onSubmit: (values: TripPreferences) => void;
  isSubmitting: boolean;
}) => {
  const { control, handleSubmit, setValue, watch } = useForm<FormValues>({
    resolver: zodResolver(tripPreferencesSchema),
    defaultValues: {
      tripDays: 2,
      companionType: "friends",
      interests: ["food", "culture", "night"],
      budgetLevel: "balanced",
      mobilityMode: "mixed",
      accessibilityNeeds: false,
      indoorFallback: true,
      locale,
      startDistrict: locale === "ko" ? "서면" : "Seomyeon",
    },
  });

  const selectedInterests = watch("interests");

  const toggleInterest = (interest: InterestTag) => {
    const next = selectedInterests.includes(interest)
      ? selectedInterests.filter((item) => item !== interest)
      : [...selectedInterests, interest];

    setValue("interests", next.length > 0 ? next : [interest]);
  };

  return (
    <View style={styles.wrapper}>
      <SectionCard title={locale === "ko" ? "여행 세팅" : "Trip setup"}>
        <Text style={styles.label}>{locale === "ko" ? "여행일" : "Trip length"}</Text>
        <View style={styles.rowWrap}>
          {[1, 2, 3].map((day) => (
            <Pill
              key={day}
              label={localized("tripDays", String(day) as keyof typeof optionLabel.tripDays, locale)}
              selected={watch("tripDays") === day}
              onPress={() => setValue("tripDays", day)}
            />
          ))}
        </View>

        <Text style={styles.label}>{locale === "ko" ? "동행자" : "Companion"}</Text>
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

        <Text style={styles.label}>{locale === "ko" ? "관심사" : "Interests"}</Text>
        <View style={styles.rowWrap}>
          {(["food", "culture", "nature", "photospot", "shopping", "history", "night", "healing"] as const).map(
            (interest) => (
              <Pill
                key={interest}
                label={localized("interests", interest, locale)}
                selected={selectedInterests.includes(interest)}
                onPress={() => toggleInterest(interest)}
              />
            )
          )}
        </View>

        <Text style={styles.label}>{locale === "ko" ? "예산" : "Budget"}</Text>
        <View style={styles.rowWrap}>
          {(["value", "balanced", "premium"] as const).map((value) => (
            <Pill
              key={value}
              label={localized("budgetLevel", value, locale)}
              selected={watch("budgetLevel") === value}
              onPress={() => setValue("budgetLevel", value)}
            />
          ))}
        </View>

        <Text style={styles.label}>{locale === "ko" ? "이동 선호" : "Mobility"}</Text>
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

        <Controller
          control={control}
          name="startDistrict"
          render={({ field: { onChange, value } }) => (
            <View style={styles.field}>
              <Text style={styles.label}>{locale === "ko" ? "출발 지역" : "Starting district"}</Text>
              <TextInput
                value={value}
                onChangeText={onChange}
                style={styles.input}
                placeholder={locale === "ko" ? "예: 서면 / 해운대" : "Example: Seomyeon / Haeundae"}
                placeholderTextColor="rgba(248,251,253,0.45)"
              />
            </View>
          )}
        />

        <Controller
          control={control}
          name="accessibilityNeeds"
          render={({ field: { onChange, value } }) => (
            <View style={styles.switchRow}>
              <View style={styles.switchCopy}>
                <Text style={styles.label}>{locale === "ko" ? "무장애 우선" : "Accessibility first"}</Text>
                <Text style={styles.hint}>
                  {locale === "ko"
                    ? "휠체어/유모차 친화도가 높은 장소를 우선 반영합니다."
                    : "Prioritize wheelchair and stroller-friendly stops."}
                </Text>
              </View>
              <Switch value={value} onValueChange={onChange} trackColor={{ true: colors.coral }} />
            </View>
          )}
        />

        <Controller
          control={control}
          name="indoorFallback"
          render={({ field: { onChange, value } }) => (
            <View style={styles.switchRow}>
              <View style={styles.switchCopy}>
                <Text style={styles.label}>{locale === "ko" ? "비 올 때 실내 대체" : "Indoor fallback"}</Text>
                <Text style={styles.hint}>
                  {locale === "ko"
                    ? "비나 일정 지연 시 실내 루트를 함께 준비합니다."
                    : "Prepare an indoor reroute for rain or schedule drift."}
                </Text>
              </View>
              <Switch value={value} onValueChange={onChange} trackColor={{ true: colors.mint }} />
            </View>
          )}
        />

        <Pressable
          onPress={handleSubmit((values) => onSubmit({ ...values, locale }))}
          style={[styles.submit, isSubmitting && styles.submitDisabled]}
          disabled={isSubmitting}
        >
          <Text style={styles.submitText}>
            {isSubmitting ? (locale === "ko" ? "생성 중..." : "Generating...") : locale === "ko" ? "AI 일정 생성" : "Generate itinerary"}
          </Text>
        </Pressable>
      </SectionCard>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
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
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  switchCopy: {
    flex: 1,
    gap: 4,
  },
  hint: {
    color: "rgba(248,251,253,0.65)",
    fontSize: 12,
    lineHeight: 18,
  },
  submit: {
    marginTop: spacing.sm,
    backgroundColor: colors.sand,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    alignItems: "center",
  },
  submitDisabled: {
    opacity: 0.6,
  },
  submitText: {
    color: colors.navy,
    fontSize: 15,
    fontWeight: "800",
  },
});
