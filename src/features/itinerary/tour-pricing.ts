import { estimatedSpendFromPriceLevel } from "./planning";

import { BudgetLevel, InterestTag, Place } from "../../types/domain";

export type VisitKoreaListItem = {
  addr1?: string;
  contentid?: string;
  contenttypeid?: string;
  mapx?: number | string;
  mapy?: number | string;
  title?: string;
};

export type VisitKoreaDetailItem = Record<string, unknown>;

const FREE_TEXT = /\bfree\b|무료/i;
const PAID_TEXT = /\bpaid\b|유료/i;
const ADULT_PRICE_PATTERNS = [
  /(?:adult(?:s)?|성인|어른|대인)[^0-9]{0,16}(\d[\d,]*)\s*(?:원|won)/i,
  /(\d[\d,]*)\s*(?:원|won)[^A-Za-z가-힣]{0,16}(?:adult(?:s)?|성인|어른|대인)/i,
];
const WON_AMOUNT_PATTERN = /(\d[\d,]*)\s*(?:원|won)\b/gi;

const INTRO_PRICE_FIELDS: Partial<Record<string, string[]>> = {
  "12": ["usefee"],
  "14": ["usefee"],
  "15": ["usetimefestival"],
  "28": ["usefeeleports"],
  "38": ["saleitemcost"],
};

const cleanTourText = (value: unknown) =>
  String(value ?? "")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();

const parseNumericValue = (value: unknown) => {
  const cleaned = cleanTourText(value).replace(/[^\d]/g, "");
  if (!cleaned) {
    return null;
  }

  const parsed = Number(cleaned);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
};

const extractAdultPrice = (text: string) => {
  for (const pattern of ADULT_PRICE_PATTERNS) {
    const match = text.match(pattern);
    if (!match?.[1]) {
      continue;
    }

    const parsed = Number(match[1].replace(/,/g, ""));
    if (Number.isFinite(parsed) && parsed >= 0) {
      return parsed;
    }
  }

  return null;
};

const extractWonAmounts = (text: string) =>
  [...text.matchAll(WON_AMOUNT_PATTERN)]
    .map((match) => Number(match[1]?.replace(/,/g, "")))
    .filter((value) => Number.isFinite(value) && value >= 0);

export const parseTourPriceText = (value: unknown) => {
  const text = cleanTourText(value);
  if (!text) {
    return null;
  }

  if (FREE_TEXT.test(text) && !PAID_TEXT.test(text)) {
    return 0;
  }

  const adultPrice = extractAdultPrice(text);
  if (adultPrice !== null) {
    return adultPrice;
  }

  const amounts = extractWonAmounts(text);
  if (amounts.length === 0) {
    return null;
  }

  return Math.round(amounts.reduce((total, amount) => total + amount, 0) / amounts.length);
};

export const derivePlacePriceLevel = (estimatedSpendKrw: number): BudgetLevel => {
  if (estimatedSpendKrw <= 19000) {
    return "value";
  }

  if (estimatedSpendKrw >= 33000) {
    return "premium";
  }

  return "balanced";
};

const pickIntroSpendEstimate = (contentTypeId: string | undefined, detailItems: VisitKoreaDetailItem[]) => {
  const fields = contentTypeId ? INTRO_PRICE_FIELDS[contentTypeId] : undefined;
  if (!fields?.length) {
    return null;
  }

  const estimates = detailItems
    .flatMap((detailItem) => fields.map((field) => parseTourPriceText(detailItem[field])))
    .filter((estimate): estimate is number => estimate !== null);

  if (estimates.length === 0) {
    return null;
  }

  return Math.round(estimates.reduce((total, estimate) => total + estimate, 0) / estimates.length);
};

const pickLodgingSpendEstimate = (detailItems: VisitKoreaDetailItem[]) => {
  const perGuestEstimates = detailItems
    .map((detailItem) => {
      const fees = [
        parseNumericValue(detailItem.roomoffseasonminfee1),
        parseNumericValue(detailItem.roomoffseasonminfee2),
        parseNumericValue(detailItem.roompeakseasonminfee1),
        parseNumericValue(detailItem.roompeakseasonminfee2),
      ].filter((fee): fee is number => fee !== null && fee > 0);

      if (fees.length === 0) {
        return null;
      }

      const occupancy =
        parseNumericValue(detailItem.roombasecount) ??
        parseNumericValue(detailItem.roommaxcount) ??
        2;

      return Math.round(Math.min(...fees) / Math.max(1, occupancy));
    })
    .filter((estimate): estimate is number => estimate !== null && estimate > 0);

  if (perGuestEstimates.length === 0) {
    return null;
  }

  return Math.min(...perGuestEstimates);
};

export const getTourDetailEndpoint = (contentTypeId?: string) => {
  if (contentTypeId === "32") {
    return "detailInfo2" as const;
  }

  return contentTypeId && INTRO_PRICE_FIELDS[contentTypeId] ? ("detailIntro2" as const) : null;
};

export const mapTourCategory = (contentTypeId?: string): InterestTag[] => {
  switch (contentTypeId) {
    case "39":
      return ["food"];
    case "38":
      return ["shopping"];
    case "14":
      return ["culture", "history"];
    case "12":
      return ["photospot", "nature"];
    default:
      return ["culture"];
  }
};

export const estimateTourPlaceSpend = ({
  contentTypeId,
  detailItems,
  fallbackEstimatedSpendKrw,
  fallbackPriceLevel,
}: {
  contentTypeId?: string;
  detailItems: VisitKoreaDetailItem[];
  fallbackEstimatedSpendKrw: number;
  fallbackPriceLevel: BudgetLevel;
}) => {
  const estimatedSpendKrw =
    (contentTypeId === "32"
      ? pickLodgingSpendEstimate(detailItems)
      : pickIntroSpendEstimate(contentTypeId, detailItems)) ?? fallbackEstimatedSpendKrw;

  return {
    estimatedSpendKrw,
    priceLevel:
      estimatedSpendKrw === fallbackEstimatedSpendKrw
        ? fallbackPriceLevel
        : derivePlacePriceLevel(estimatedSpendKrw),
  };
};

export const buildTourPlaceFromApi = ({
  item,
  detailItems,
  index,
}: {
  item: VisitKoreaListItem;
  detailItems?: VisitKoreaDetailItem[];
  index: number;
}): Place => {
  const categories = mapTourCategory(item.contenttypeid);
  const fallbackPriceLevel: BudgetLevel = "balanced";
  const fallbackEstimatedSpendKrw = estimatedSpendFromPriceLevel(fallbackPriceLevel, categories);
  const pricing = estimateTourPlaceSpend({
    contentTypeId: item.contenttypeid,
    detailItems: detailItems ?? [],
    fallbackEstimatedSpendKrw,
    fallbackPriceLevel,
  });

  return {
    id: `tour-${item.contentid ?? index}`,
    slug: String(item.title ?? `tour-${index}`)
      .toLowerCase()
      .replace(/\s+/g, "-"),
    district: item.addr1 ?? "Busan",
    categories,
    name: {
      ko: item.title ?? "부산 관광지",
      en: item.title ?? "Busan attraction",
    },
    description: {
      ko: item.addr1 ?? "부산 관광 데이터 기반 추천 장소입니다.",
      en: item.addr1 ?? "Recommended from the Korea Tourism public dataset.",
    },
    signatureStory: {
      ko: item.addr1 ?? "공공 관광 데이터에서 불러온 장소입니다.",
      en: item.addr1 ?? "Collected from public tourism data.",
    },
    coordinates: {
      latitude: Number(item.mapy),
      longitude: Number(item.mapx),
    },
    indoor: item.contenttypeid === "14" || item.contenttypeid === "39",
    accessibility: true,
    recommendedStayMinutes: 60,
    popularity: 70 - index,
    crowdBase: 40,
    priceLevel: pricing.priceLevel,
    estimatedSpendKrw: pricing.estimatedSpendKrw,
  };
};
