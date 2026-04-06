import { AppLocale, LocalizedText } from "../types/domain";

export const tText = (value: LocalizedText, locale: AppLocale) =>
  locale === "ko" ? value.ko : value.en;

export const normalizeLocale = (value?: string | null): AppLocale =>
  value?.toLowerCase().startsWith("en") ? "en" : "ko";
