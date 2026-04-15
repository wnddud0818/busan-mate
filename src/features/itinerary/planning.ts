import { parseISO } from "date-fns";

import { getStartArea, startAreas } from "../../data/start-areas";
import {
  BudgetLevel,
  BudgetSummary,
  InterestTag,
  LocalizedText,
  StartArea,
  StartAreaId,
  TripPreferences,
} from "../../types/domain";
import { formatKrwCompact } from "../../utils/currency";

const budgetLabelMap: Record<BudgetLevel, LocalizedText> = {
  value: { ko: "1인 4만~7만 원", en: "KRW 40k-70k per person" },
  balanced: { ko: "1인 7만~12만 원", en: "KRW 70k-120k per person" },
  premium: { ko: "1인 12만 원 이상", en: "KRW 120k+ per person" },
};

export const makeBudgetLabel = (budgetLevel: BudgetLevel) => budgetLabelMap[budgetLevel];

export const estimatedSpendFromPriceLevel = (
  priceLevel: BudgetLevel,
  categories: InterestTag[] = []
) => {
  const base = priceLevel === "value" ? 14000 : priceLevel === "premium" ? 42000 : 24000;
  const foodBoost = categories.includes("food") ? 9000 : 0;
  const shoppingBoost = categories.includes("shopping") ? 6000 : 0;
  const historyDiscount = categories.includes("history") ? -2000 : 0;

  return Math.max(7000, base + foodBoost + shoppingBoost + historyDiscount);
};

export const deriveBudgetLevel = ({
  totalBudgetKrw,
  partySize,
}: Pick<TripPreferences, "totalBudgetKrw" | "partySize">): BudgetLevel => {
  const perPersonBudget = totalBudgetKrw / Math.max(1, partySize);

  if (perPersonBudget <= 70000) {
    return "value";
  }

  if (perPersonBudget >= 120000) {
    return "premium";
  }

  return "balanced";
};

export const normalizeTripPreferences = (preferences: TripPreferences): TripPreferences => ({
  ...preferences,
  budgetLevel: deriveBudgetLevel(preferences),
});

export const buildBudgetSummary = ({
  totalBudgetKrw,
  estimatedTotalKrw,
  partySize,
  strategy,
}: {
  totalBudgetKrw: number;
  estimatedTotalKrw: number;
  partySize: number;
  strategy: BudgetSummary["strategy"];
}): BudgetSummary => {
  const remainingBudgetKrw = totalBudgetKrw - estimatedTotalKrw;
  const estimatedPerPersonKrw = Math.round(estimatedTotalKrw / Math.max(1, partySize));
  const totalBudgetCompact = formatKrwCompact(totalBudgetKrw, "ko");
  const estimatedCompact = formatKrwCompact(estimatedTotalKrw, "ko");
  const totalBudgetCompactEn = formatKrwCompact(totalBudgetKrw, "en");
  const estimatedCompactEn = formatKrwCompact(estimatedTotalKrw, "en");

  return {
    totalBudgetKrw,
    estimatedTotalKrw,
    estimatedPerPersonKrw,
    remainingBudgetKrw,
    strategy,
    summary:
      strategy === "minimum"
        ? {
            ko: `예산 ${totalBudgetCompact}로 가능한 최저 예산 경로를 맞췄어요. 예상 ${estimatedCompact}`,
            en: `We built the lowest-cost valid route for ${totalBudgetCompactEn}. Estimated ${estimatedCompactEn}.`,
          }
        : {
            ko: `예산 ${totalBudgetCompact} 중 예상 ${estimatedCompact}`,
            en: `${estimatedCompactEn} estimated out of ${totalBudgetCompactEn}`,
          },
  };
};

export const getStartAreaOrDefault = (startAreaId: StartAreaId): StartArea =>
  getStartArea(startAreaId) ?? startAreas[0]!;

export const isIsoDate = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const parsed = parseISO(value);
  return !Number.isNaN(parsed.getTime());
};
