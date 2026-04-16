import { useMemo, useState } from "react";
import { Feather } from "@expo/vector-icons";
import { useMutation } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";

import { GuestUpgradeCard } from "../../src/components/common/guest-upgrade-card";
import { Screen } from "../../src/components/common/screen";
import { SectionCard } from "../../src/components/common/section-card";
import { StopCard } from "../../src/components/itinerary/stop-card";
import { sendMagicLink } from "../../src/services/auth-service";
import {
  openNavigationLink,
  requestLiveGuidePermissions,
  saveTrackingState,
} from "../../src/services/location-service";
import { publishItinerary } from "../../src/services/publish-service";
import { rateItinerary } from "../../src/services/rating-service";
import { syncLiveSession } from "../../src/services/session-service";
import { useAppStore } from "../../src/stores/app-store";
import { radii, spacing } from "../../src/theme/tokens";
import { useColors } from "../../src/theme/use-colors";
import { AppLocale, PlannerCandidateDebug } from "../../src/types/domain";
import { formatKrwCompact, formatKrwFull } from "../../src/utils/currency";
import { buildNavigationLinks } from "../../src/utils/maps";

const engineLabel = (engine: string, locale: AppLocale) => {
  switch (engine) {
    case "remote-ai":
      return locale === "ko" ? "원격 AI" : "Remote AI";
    case "indoor-fallback":
      return locale === "ko" ? "실내 대체" : "Indoor fallback";
    default:
      return locale === "ko" ? "로컬 fallback" : "Local fallback";
  }
};

const sourceLabel = (source: string, locale: AppLocale) => {
  switch (source) {
    case "live":
      return locale === "ko" ? "라이브" : "Live";
    case "mixed":
      return locale === "ko" ? "라이브+시드" : "Live + seed";
    default:
      return locale === "ko" ? "시드" : "Seed";
  }
};

const strategyLabel = (strategy: string, locale: AppLocale) => {
  if (strategy === "minimum") {
    return locale === "ko" ? "최저 예산 우선" : "Minimum budget";
  }

  return locale === "ko" ? "예산 내 최적" : "Within budget";
};

const selectionStageLabel = (stage: string, locale: AppLocale) => {
  if (stage === "trimmed") {
    return locale === "ko" ? "예산 과정에서 제외" : "Trimmed";
  }

  return locale === "ko" ? "최종 미선택" : "Not selected";
};

const yesNoLabel = (value: boolean, locale: AppLocale) =>
  value ? (locale === "ko" ? "예" : "Yes") : locale === "ko" ? "아니오" : "No";

const scoreLabelMap: Record<string, { ko: string; en: string }> = {
  interest: { ko: "관심사", en: "interest" },
  accessibility: { ko: "접근성", en: "accessibility" },
  fallback: { ko: "실내대체", en: "fallback" },
  mobility: { ko: "이동성", en: "mobility" },
  budget: { ko: "예산", en: "budget" },
  companion: { ko: "동행", en: "companion" },
  weather: { ko: "날씨", en: "weather" },
  distance: { ko: "거리", en: "distance" },
  popularity: { ko: "인기", en: "popularity" },
};

const summarizeScore = (candidate: PlannerCandidateDebug, locale: AppLocale) =>
  Object.entries(candidate.scoreBreakdown)
    .sort((left, right) => Math.abs(right[1]) - Math.abs(left[1]))
    .slice(0, 3)
    .map(([key, value]) => {
      const label = scoreLabelMap[key]?.[locale] ?? key;
      const prefix = value > 0 ? "+" : "";
      return `${label} ${prefix}${value}`;
    })
    .join(" / ");

const DecisionStat = ({
  label,
  value,
  colors,
}: {
  label: string;
  value: string;
  colors: ReturnType<typeof useColors>;
}) => (
  <View style={[styles.statCard, { backgroundColor: colors.glass, borderColor: colors.line }]}>
    <Text style={[styles.statLabel, { color: colors.mist }]}>{label}</Text>
    <Text style={[styles.statValue, { color: colors.cloud }]}>{value}</Text>
  </View>
);

export default function ItineraryDetailPage() {
  const params = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const locale = useAppStore((state) => state.locale);
  const itinerary = useAppStore((state) => state.itineraries.find((item) => item.id === params.id));
  const profile = useAppStore((state) => state.userProfile);
  const debugLogs = useAppStore((state) => state.debugLogs);
  const {
    startSession,
    updateSession,
    setUserProfile,
    upsertItinerary,
    upsertSharedItinerary,
    setLocationConsent,
  } = useAppStore((state) => state.actions);
  const { t } = useTranslation();
  const [showRawDebug, setShowRawDebug] = useState(false);
  const [showAllDroppedCandidates, setShowAllDroppedCandidates] = useState(false);

  const publishMutation = useMutation({
    mutationFn: async () => {
      if (!itinerary) throw new Error("Missing itinerary");
      return publishItinerary({ itinerary, userProfile: profile });
    },
    onSuccess: (result) => {
      if (result.upgradeRequired) {
        Alert.alert(
          locale === "ko" ? "업그레이드 필요" : "Upgrade required",
          locale === "ko"
            ? "공유하려면 매직 링크 로그인으로 전환해 주세요."
            : "Use a magic link before publishing."
        );
        return;
      }
      upsertItinerary(result.itinerary);
      upsertSharedItinerary(result.shared);
      if (result.syncStatus === "pending") {
        Alert.alert(
          "Busan Mate",
          locale === "ko"
            ? "원격 저장에 실패해 우선 로컬에만 저장했어요."
            : "Remote sync failed, saved locally for now."
        );
      }
    },
  });

  const ratingMutation = useMutation({
    mutationFn: async () => {
      if (!itinerary) throw new Error("Missing itinerary");
      return rateItinerary({ itinerary, rating: 5, userProfile: profile });
    },
    onSuccess: (result) => {
      upsertItinerary(result.itinerary);
      if (result.shared) upsertSharedItinerary(result.shared);
    },
  });

  if (!itinerary) {
    return (
      <Screen title="Busan Mate" showBack>
        <Text style={{ color: colors.mist }}>
          {locale === "ko" ? "일정을 찾을 수 없어요." : "Itinerary not found."}
        </Text>
      </Screen>
    );
  }

  const planningDebug = itinerary.planningMeta.debug;
  const candidateMap = new Map(
    (planningDebug?.candidatePlaces ?? []).map((candidate) => [candidate.placeId, candidate])
  );
  const selectedStops = itinerary.days.flatMap((day) =>
    day.stops.map((stop) => ({
      dayNumber: day.dayNumber,
      stop,
      candidate: candidateMap.get(stop.place.id),
    }))
  );
  const lodging = itinerary.planningMeta.lodging;
  const hasLodgingCost = Boolean(lodging && lodging.nights > 0 && lodging.estimatedTotalKrw > 0);
  const allDroppedCandidates = (planningDebug?.candidatePlaces ?? [])
    .filter((candidate) => !candidate.selected)
    .sort((left, right) => {
      if (left.selectionStage !== right.selectionStage) {
        return left.selectionStage === "trimmed" ? -1 : 1;
      }

      return right.score - left.score;
    });
  const droppedCandidates = showAllDroppedCandidates
    ? allDroppedCandidates
    : allDroppedCandidates.slice(0, 3);

  const placeSpendTotalKrw = selectedStops.reduce(
    (total, item) => total + item.stop.place.estimatedSpendKrw * itinerary.preferences.partySize,
    0
  );
  const transitSpendTotalKrw = selectedStops.reduce(
    (total, item) =>
      total + (item.stop.transitFromPrevious?.estimatedFareKrw ?? 0) * itinerary.preferences.partySize,
    0
  );
  const lodgingSpendTotalKrw = lodging?.estimatedTotalKrw ?? 0;
  const budgetSelectedCount =
    planningDebug?.candidatePlaces.filter(
      (candidate) => candidate.selectionStage === "final" || candidate.selectionStage === "trimmed"
    ).length ?? selectedStops.length;
  const rawLogs = useMemo(
    () =>
      debugLogs
        .filter((log) =>
          [
            "generate-itinerary",
            "generate-itinerary.planner",
            "generate-itinerary.price",
            "weather.forecast",
            "visit-korea.areaBasedList2",
            "visit-korea.searchStay2",
            "visit-korea.detailInfo2",
            "visit-korea.detailIntro2",
            "odsay.searchPubTransPathT",
            "get-transit-route",
          ].includes(log.label)
        )
        .slice(0, 12),
    [debugLogs]
  );
  const weatherParts = [
    planningDebug?.weatherValues.signal,
    planningDebug?.weatherValues.temperatureMaxC != null && planningDebug?.weatherValues.temperatureMinC != null
      ? `${planningDebug.weatherValues.temperatureMinC}C - ${planningDebug.weatherValues.temperatureMaxC}C`
      : null,
    planningDebug?.weatherValues.precipitationProbabilityMax != null
      ? `${planningDebug.weatherValues.precipitationProbabilityMax}%`
      : null,
  ].filter(Boolean);

  const launchSession = async ({
    askPermission,
    destination,
  }: {
    askPermission: boolean;
    destination: "guide" | "live";
  }) => {
    const draftSession = startSession(itinerary);
    const permissionGranted = askPermission ? await requestLiveGuidePermissions() : false;
    const nextSession = { ...draftSession, locationConsent: permissionGranted };
    setLocationConsent(permissionGranted);
    const result = await syncLiveSession({ itinerary, session: nextSession, userProfile: profile });
    upsertItinerary(result.itinerary);
    updateSession(result.session);
    await saveTrackingState(result.itinerary, result.session);
    router.push(
      destination === "live" ? `/trip/${result.session.id}` : `/trip/${result.session.id}/guide`
    );
  };

  const isPublished = itinerary.shareStatus === "published";

  return (
    <Screen title={itinerary.title[locale]} subtitle={itinerary.summary[locale]} showBack>
      <SectionCard>
        <Text style={[styles.budgetLabel, { color: colors.sand }]}>
          {itinerary.planningMeta.budgetSummary.summary[locale]}
        </Text>

        <View style={styles.metaStack}>
          <View style={styles.metaRow}>
            <Feather name="dollar-sign" size={13} color={colors.mint} />
            <Text style={[styles.metaCopy, { color: colors.mist }]}>
              {locale === "ko"
                ? `총 ${formatKrwFull(itinerary.planningMeta.budgetSummary.estimatedTotalKrw, locale)} / 1인 ${formatKrwCompact(itinerary.planningMeta.budgetSummary.estimatedPerPersonKrw, locale)}`
                : `Total ${formatKrwFull(itinerary.planningMeta.budgetSummary.estimatedTotalKrw, locale)} / ${formatKrwCompact(itinerary.planningMeta.budgetSummary.estimatedPerPersonKrw, locale)} per person`}
            </Text>
          </View>
          <View style={styles.metaRow}>
            <Feather name="cloud" size={13} color={colors.mint} />
            <Text style={[styles.metaCopy, { color: colors.mist }]}>
              {itinerary.planningMeta.weatherSnapshot.summary[locale]}
            </Text>
          </View>
          <View style={styles.metaRow}>
            <Feather name="map-pin" size={13} color={colors.mint} />
            <Text style={[styles.metaCopy, { color: colors.mist }]}>
              {locale === "ko"
                ? `${itinerary.planningMeta.startArea.name.ko} 출발`
                : `Starting near ${itinerary.planningMeta.startArea.name.en}`}
            </Text>
          </View>
        </View>

        <View style={styles.actionGroup}>
          <Pressable
            style={[styles.primaryBtn, { backgroundColor: colors.coral }]}
            onPress={() => launchSession({ askPermission: true, destination: "live" })}
          >
            <Feather name="navigation" size={16} color={colors.navy} />
            <Text style={[styles.primaryBtnText, { color: colors.navy }]}>
              {t("itinerary.startGuide")}
            </Text>
          </Pressable>
          <Pressable
            style={[styles.secondaryBtn, { backgroundColor: colors.glass, borderColor: colors.line }]}
            onPress={() => publishMutation.mutate()}
          >
            <Feather name={isPublished ? "check-circle" : "share-2"} size={16} color={colors.cloud} />
            <Text style={[styles.secondaryBtnText, { color: colors.cloud }]}>
              {isPublished ? t("itinerary.published") : t("itinerary.publish")}
            </Text>
          </Pressable>
        </View>

        <View style={styles.inlineGroup}>
          <Pressable
            style={[styles.inlineBtn, { borderColor: colors.line, backgroundColor: colors.glass }]}
            onPress={() => launchSession({ askPermission: false, destination: "guide" })}
          >
            <Feather name="message-circle" size={13} color={colors.cloud} />
            <Text style={[styles.inlineBtnText, { color: colors.cloud }]}>{t("itinerary.askGuide")}</Text>
          </Pressable>
          <Pressable
            style={[styles.inlineBtn, { borderColor: colors.line, backgroundColor: colors.glass }]}
            onPress={() => ratingMutation.mutate()}
          >
            <Feather name="star" size={13} color={colors.sand} />
            <Text style={[styles.inlineBtnText, { color: colors.cloud }]}>
              {locale === "ko" ? "5점 남기기" : "Rate 5.0"}
            </Text>
          </Pressable>
        </View>
      </SectionCard>

      {planningDebug ? (
        <SectionCard
          title={locale === "ko" ? "결정 디버그" : "Decision debug"}
          hint={
            locale === "ko"
              ? "일정이 왜 이렇게 정해졌는지 필요한 정보만 보여줍니다."
              : "Only the key decision signals behind this itinerary."
          }
          variant="highlight"
        >
          <View style={styles.statGrid}>
            <DecisionStat
              label={locale === "ko" ? "엔진" : "Engine"}
              value={engineLabel(planningDebug.engine, locale)}
              colors={colors}
            />
            <DecisionStat
              label={locale === "ko" ? "무중단" : "Fallback-free"}
              value={yesNoLabel(planningDebug.routeResolvedWithoutFallback, locale)}
              colors={colors}
            />
            <DecisionStat
              label={locale === "ko" ? "전략" : "Strategy"}
              value={strategyLabel(planningDebug.selectedStrategy, locale)}
              colors={colors}
            />
            <DecisionStat
              label={locale === "ko" ? "후보" : "Candidates"}
              value={`${planningDebug.candidatePlaces.length} -> ${planningDebug.finalStopCount}`}
              colors={colors}
            />
          </View>

          <View style={[styles.processCard, { backgroundColor: colors.glass, borderColor: colors.line }]}>
            <Text style={[styles.processTitle, { color: colors.cloud }]}>
              {locale === "ko" ? "결정 과정" : "Decision flow"}
            </Text>
            <Text style={[styles.processLine, { color: colors.mist }]}>
              {locale === "ko"
                ? `후보 ${planningDebug.candidatePlaces.length}개 수집 -> 예산 기준 ${budgetSelectedCount}개 통과 -> 최종 ${planningDebug.finalStopCount}개 확정`
                : `${planningDebug.candidatePlaces.length} candidates -> ${budgetSelectedCount} passed budget -> ${planningDebug.finalStopCount} finalized`}
            </Text>
            <Text style={[styles.processLine, { color: colors.mist }]}>
              {locale === "ko"
                ? `후보 소스 ${sourceLabel(planningDebug.placesSource, locale)} / 날씨 ${weatherParts.join(" / ")}`
                : `Sources ${sourceLabel(planningDebug.placesSource, locale)} / Weather ${weatherParts.join(" / ")}`}
            </Text>
            <Text style={[styles.processLine, { color: colors.mist }]}>
              {locale === "ko"
                ? `교통 live ${planningDebug.liveTransitLegCount} / fallback ${planningDebug.fallbackTransitLegCount} / 트리밍 ${yesNoLabel(planningDebug.trimmedToBudget, locale)}`
                : `Transit live ${planningDebug.liveTransitLegCount} / fallback ${planningDebug.fallbackTransitLegCount} / trimmed ${yesNoLabel(planningDebug.trimmedToBudget, locale)}`}
            </Text>
          </View>

          <Pressable
            style={[styles.rawToggle, { borderColor: colors.line, backgroundColor: colors.glass }]}
            onPress={() => setShowRawDebug((current) => !current)}
          >
            <Feather name={showRawDebug ? "chevron-up" : "code"} size={14} color={colors.cloud} />
            <Text style={[styles.rawToggleText, { color: colors.cloud }]}>
              {showRawDebug
                ? locale === "ko"
                  ? "원본 payload 숨기기"
                  : "Hide raw payloads"
                : locale === "ko"
                  ? "원본 payload / response 보기"
                  : "View raw payloads / responses"}
            </Text>
          </Pressable>

          {showRawDebug ? (
            <View style={styles.rawStack}>
              {rawLogs.length === 0 ? (
                <Text style={[styles.compactCopy, { color: colors.mist }]}>
                  {locale === "ko"
                    ? "표시할 원본 로그가 아직 없어요."
                    : "No raw logs available yet."}
                </Text>
              ) : (
                rawLogs.map((log) => (
                  <View
                    key={`${log.id}-raw`}
                    style={[styles.rawCard, { backgroundColor: colors.surface, borderColor: colors.line }]}
                  >
                    <Text style={[styles.compactTitle, { color: colors.cloud }]}>
                      {`${log.label} / ${log.stage}`}
                    </Text>
                    {log.summary ? (
                      <Text style={[styles.compactCopy, { color: colors.mist }]}>{log.summary}</Text>
                    ) : null}
                    {log.payload !== undefined ? (
                      <Text style={[styles.rawPayload, { color: colors.smoke }]} selectable>
                        {JSON.stringify(log.payload, null, 2)}
                      </Text>
                    ) : null}
                  </View>
                ))
              )}
            </View>
          ) : null}
        </SectionCard>
      ) : null}

      <SectionCard
        title={locale === "ko" ? "가격 요약" : "Price summary"}
        hint={
          locale === "ko"
            ? "최종 일정이 예산 안에서 어떻게 구성됐는지 바로 확인할 수 있어요."
            : "How the final route fits inside the budget."
        }
      >
        <View style={styles.statGrid}>
          <DecisionStat
            label={locale === "ko" ? "총 예상" : "Estimated total"}
            value={formatKrwFull(itinerary.planningMeta.budgetSummary.estimatedTotalKrw, locale)}
            colors={colors}
          />
          <DecisionStat
            label={locale === "ko" ? "장소" : "Places"}
            value={formatKrwFull(placeSpendTotalKrw, locale)}
            colors={colors}
          />
          <DecisionStat
            label={locale === "ko" ? "이동" : "Transit"}
            value={formatKrwFull(transitSpendTotalKrw, locale)}
            colors={colors}
          />
          {hasLodgingCost ? (
            <DecisionStat
              label={locale === "ko" ? "숙소" : "Lodging"}
              value={formatKrwFull(lodgingSpendTotalKrw, locale)}
              colors={colors}
            />
          ) : null}
          <DecisionStat
            label={locale === "ko" ? "잔여 예산" : "Remaining"}
            value={formatKrwFull(itinerary.planningMeta.budgetSummary.remainingBudgetKrw, locale)}
            colors={colors}
          />
        </View>

        {hasLodgingCost && lodging ? (
          <View
            key="price-lodging"
            style={[styles.compactRow, { borderTopColor: colors.line }]}
          >
            <Text style={[styles.compactTitle, { color: colors.cloud }]}>
              {lodging.propertyName?.[locale] ??
                (locale === "ko" ? "숙소 예상" : "Lodging estimate")}
            </Text>
            <Text style={[styles.compactCopy, { color: colors.mist }]}>
              {locale === "ko"
                ? `${lodging.nights}박 / ${lodging.estimatedRoomCount}실 / 1박 ${formatKrwFull(lodging.estimatedNightlyRateKrw, locale)} / 총 ${formatKrwFull(lodging.estimatedTotalKrw, locale)}`
                : `${lodging.nights} night(s) / ${lodging.estimatedRoomCount} room(s) / ${formatKrwFull(lodging.estimatedNightlyRateKrw, locale)} per night / total ${formatKrwFull(lodging.estimatedTotalKrw, locale)}`}
            </Text>
            {lodging.district ? (
              <Text style={[styles.compactCopy, { color: colors.mist }]}>{lodging.district}</Text>
            ) : null}
            {lodging.checkInTime || lodging.checkOutTime ? (
              <Text style={[styles.compactCopy, { color: colors.mist }]}>
                {locale === "ko"
                  ? `체크인 ${lodging.checkInTime ?? "-"} / 체크아웃 ${lodging.checkOutTime ?? "-"}`
                  : `Check-in ${lodging.checkInTime ?? "-"} / Check-out ${lodging.checkOutTime ?? "-"}`}
              </Text>
            ) : null}
            {lodging.note ? (
              <Text style={[styles.compactCopy, { color: colors.mint }]}>{lodging.note[locale]}</Text>
            ) : null}
          </View>
        ) : null}

        {selectedStops.map(({ dayNumber, stop }) => (
          <View
            key={`price-${stop.id}`}
            style={[styles.compactRow, { borderTopColor: colors.line }]}
          >
            <Text style={[styles.compactTitle, { color: colors.cloud }]}>
              {`Day ${dayNumber} · ${stop.order}. ${stop.place.name[locale]}`}
            </Text>
            <Text style={[styles.compactCopy, { color: colors.mist }]}>
              {locale === "ko"
                ? `장소 ${formatKrwFull(stop.place.estimatedSpendKrw * itinerary.preferences.partySize, locale)} / 이동 ${formatKrwFull((stop.transitFromPrevious?.estimatedFareKrw ?? 0) * itinerary.preferences.partySize, locale)}`
                : `Place ${formatKrwFull(stop.place.estimatedSpendKrw * itinerary.preferences.partySize, locale)} / Transit ${formatKrwFull((stop.transitFromPrevious?.estimatedFareKrw ?? 0) * itinerary.preferences.partySize, locale)}`}
            </Text>
          </View>
        ))}
      </SectionCard>

      {planningDebug ? (
        <SectionCard
          title={locale === "ko" ? "선택된 후보" : "Chosen candidates"}
          hint={
            locale === "ko"
              ? "실제로 일정에 들어간 장소만 점수와 함께 봅니다."
              : "Only the places that made it into the route."
          }
        >
          {selectedStops.map(({ dayNumber, stop, candidate }) => (
            <View
              key={`selected-${stop.id}`}
              style={[styles.compactRow, { borderTopColor: colors.line }]}
            >
              <Text style={[styles.compactTitle, { color: colors.cloud }]}>
                {`Day ${dayNumber} · ${stop.order}. ${stop.place.name[locale]}`}
              </Text>
              <Text style={[styles.compactCopy, { color: colors.mist }]}>
                {locale === "ko"
                  ? `점수 ${candidate?.score ?? "-"} / 예상 ${formatKrwFull(stop.place.estimatedSpendKrw, locale)} / 거리 ${candidate?.distanceFromStartKm ?? "-"}km`
                  : `Score ${candidate?.score ?? "-"} / Est. ${formatKrwFull(stop.place.estimatedSpendKrw, locale)} / Distance ${candidate?.distanceFromStartKm ?? "-"} km`}
              </Text>
              <Text style={[styles.compactCopy, { color: colors.mint }]}>
                {candidate
                  ? summarizeScore(candidate, locale)
                  : locale === "ko"
                    ? "점수 세부 정보 없음"
                    : "No score details"}
              </Text>
              {stop.transitFromPrevious ? (
                <Text style={[styles.compactCopy, { color: colors.mist }]}>
                  {locale === "ko"
                    ? `이전 이동 ${stop.transitFromPrevious.provider} / ${stop.transitFromPrevious.durationMinutes}분 / ${formatKrwFull(stop.transitFromPrevious.estimatedFareKrw, locale)}`
                    : `Prev transit ${stop.transitFromPrevious.provider} / ${stop.transitFromPrevious.durationMinutes} min / ${formatKrwFull(stop.transitFromPrevious.estimatedFareKrw, locale)}`}
                </Text>
              ) : null}
            </View>
          ))}
        </SectionCard>
      ) : null}

      {planningDebug && allDroppedCandidates.length > 0 ? (
        <SectionCard
          title={locale === "ko" ? "제외된 후보" : "Dropped candidates"}
          hint={
            locale === "ko"
              ? "디버그에 꼭 필요한 상위 제외 후보만 보여줍니다."
              : "Only the top dropped candidates worth checking."
          }
          variant="warning"
        >
          {droppedCandidates.map((candidate) => (
            <View
              key={`dropped-${candidate.placeId}`}
              style={[styles.compactRow, { borderTopColor: colors.line }]}
            >
              <Text style={[styles.compactTitle, { color: colors.cloud }]}>
                {candidate.name[locale]}
              </Text>
              <Text style={[styles.compactCopy, { color: colors.mist }]}>
                {locale === "ko"
                  ? `${selectionStageLabel(candidate.selectionStage, locale)} / 점수 ${candidate.score} / 예상 ${formatKrwFull(candidate.estimatedSpendKrw, locale)}`
                  : `${selectionStageLabel(candidate.selectionStage, locale)} / Score ${candidate.score} / Est. ${formatKrwFull(candidate.estimatedSpendKrw, locale)}`}
              </Text>
              <Text style={[styles.compactCopy, { color: colors.warning }]}>
                {summarizeScore(candidate, locale)}
              </Text>
            </View>
          ))}
          {allDroppedCandidates.length > 3 ? (
            <Pressable
              style={[styles.expandToggle, { borderColor: colors.line, backgroundColor: colors.glass }]}
              onPress={() => setShowAllDroppedCandidates((current) => !current)}
            >
              <Feather
                name={showAllDroppedCandidates ? "chevron-up" : "chevron-down"}
                size={14}
                color={colors.cloud}
              />
              <Text style={[styles.expandToggleText, { color: colors.cloud }]}>
                {showAllDroppedCandidates
                  ? locale === "ko"
                    ? "제외된 후보 접기"
                    : "Collapse dropped candidates"
                  : locale === "ko"
                    ? `제외된 후보 전체 보기 (${allDroppedCandidates.length}개)`
                    : `View all dropped candidates (${allDroppedCandidates.length})`}
              </Text>
            </Pressable>
          ) : null}
        </SectionCard>
      ) : null}

      {profile?.isAnonymous ? (
        <GuestUpgradeCard
          locale={locale}
          onSend={async (email) => {
            const upgraded = await sendMagicLink(email, locale);
            setUserProfile(upgraded);
          }}
        />
      ) : null}

      {itinerary.days.map((day) => (
        <SectionCard key={day.dayNumber} title={`Day ${day.dayNumber}`} hint={day.theme[locale]}>
          {day.stops.map((stop) => {
            const navigationLinks = stop.transitFromPrevious?.navigationLinks ?? buildNavigationLinks(stop.place.coordinates);

            return (
              <StopCard
                key={stop.id}
                stop={stop}
                locale={locale}
                onOpenGoogleMaps={() => openNavigationLink(navigationLinks.googleMaps)}
                onOpenNaverMap={() => openNavigationLink(navigationLinks.naverMap)}
                onBooking={() =>
                  stop.place.bookingUrl ? openNavigationLink(stop.place.bookingUrl) : undefined
                }
              />
            );
          })}
        </SectionCard>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  budgetLabel: {
    fontSize: 16,
    fontWeight: "800",
    lineHeight: 24,
  },
  metaStack: {
    gap: 7,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  metaCopy: {
    fontSize: 13,
    lineHeight: 19,
    flex: 1,
  },
  actionGroup: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  primaryBtn: {
    flex: 1,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  primaryBtnText: {
    fontWeight: "800",
    fontSize: 14,
  },
  secondaryBtn: {
    flex: 1,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  secondaryBtnText: {
    fontWeight: "700",
    fontSize: 14,
  },
  inlineGroup: {
    flexDirection: "row",
    gap: spacing.sm,
    flexWrap: "wrap",
  },
  inlineBtn: {
    borderRadius: radii.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  inlineBtnText: {
    fontSize: 13,
    fontWeight: "600",
  },
  statGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  statCard: {
    minWidth: "47%",
    flex: 1,
    borderRadius: radii.md,
    borderWidth: 1,
    padding: spacing.md,
    gap: 4,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: "700",
  },
  statValue: {
    fontSize: 15,
    fontWeight: "800",
    lineHeight: 20,
  },
  processCard: {
    borderRadius: radii.md,
    borderWidth: 1,
    padding: spacing.md,
    gap: 6,
  },
  processTitle: {
    fontSize: 13,
    fontWeight: "800",
  },
  processLine: {
    fontSize: 12,
    lineHeight: 18,
  },
  rawToggle: {
    alignSelf: "flex-start",
    borderRadius: radii.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  rawToggleText: {
    fontSize: 12,
    fontWeight: "700",
  },
  rawStack: {
    gap: spacing.sm,
  },
  rawCard: {
    borderRadius: radii.md,
    borderWidth: 1,
    padding: spacing.md,
    gap: 6,
  },
  rawPayload: {
    fontSize: 11,
    lineHeight: 17,
    fontFamily: "monospace",
  },
  expandToggle: {
    alignSelf: "flex-start",
    borderRadius: radii.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: spacing.xs,
  },
  expandToggleText: {
    fontSize: 12,
    fontWeight: "700",
  },
  compactRow: {
    gap: 4,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
  },
  compactTitle: {
    fontSize: 13,
    fontWeight: "800",
  },
  compactCopy: {
    fontSize: 12,
    lineHeight: 18,
  },
});
