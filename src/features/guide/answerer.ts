import { seedPlaces } from "../../data/seed";
import { GuideAnswer, GuideContext } from "../../types/domain";
import { tText } from "../../utils/localized";

const fallbackByLocale = {
  ko: "정확한 근거 데이터를 찾지 못했어요. 일정 카드의 공식 설명과 관광공사 정보를 함께 확인해 주세요.",
  en: "I could not find reliable supporting data for that yet. Please cross-check the official place details in the itinerary card.",
};

export const buildGuideAnswer = (question: string, context: GuideContext): GuideAnswer => {
  const lower = question.toLowerCase();
  const place = context.stop.place;
  const locale = context.locale;

  if (lower.includes("why") || lower.includes("왜") || lower.includes("이름")) {
    return {
      answer: tText(place.signatureStory, locale),
      suggestions:
        locale === "ko"
          ? ["이 근처에서 사진 찍기 좋은 포인트는?", "지금 이동 시간은 얼마나 걸려?"]
          : ["Where is the best photo angle nearby?", "How long is the next transfer?"],
      citations: [tText(place.name, locale), tText(place.description, locale)],
      confidence: "high",
    };
  }

  if (
    lower.includes("what") ||
    lower.includes("추천") ||
    lower.includes("see") ||
    lower.includes("볼")
  ) {
    return {
      answer: tText(place.description, locale),
      suggestions:
        locale === "ko"
          ? ["실내 대체 장소도 알려줘", "이동 경로를 다시 정리해줘"]
          : ["Suggest an indoor backup", "Summarize the next transfer for me"],
      citations: [tText(place.name, locale)],
      confidence: "medium",
    };
  }

  const backup = seedPlaces.find((candidate) => candidate.indoor && candidate.id !== place.id);

  return {
    answer: fallbackByLocale[locale],
    suggestions:
      locale === "ko"
        ? [backup ? `${backup.name.ko}로 대체 일정 보기` : "실내 대체 일정 보기", "다음 출발 시간을 알려줘"]
        : [backup ? `Switch to ${backup.name.en}` : "Show indoor fallback", "Tell me the next departure time"],
    citations: [tText(place.name, locale)],
    confidence: "fallback",
  };
};
