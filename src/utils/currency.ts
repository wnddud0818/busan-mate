import { AppLocale } from "../types/domain";

const compactKo = (value: number) => {
  if (value >= 10000) {
    const tenThousands = value / 10000;
    const rounded = tenThousands >= 100 ? Math.round(tenThousands) : Math.round(tenThousands * 10) / 10;
    return `${rounded}만원`;
  }

  return `${Math.round(value).toLocaleString("ko-KR")}원`;
};

const compactEn = (value: number) => {
  if (value >= 1000) {
    const thousands = value / 1000;
    const rounded = thousands >= 100 ? Math.round(thousands) : Math.round(thousands * 10) / 10;
    return `KRW ${rounded}k`;
  }

  return `KRW ${Math.round(value)}`;
};

export const formatKrwCompact = (value: number, locale: AppLocale) =>
  locale === "ko" ? compactKo(value) : compactEn(value);

export const formatKrwFull = (value: number, locale: AppLocale) =>
  locale === "ko" ? `${Math.round(value).toLocaleString("ko-KR")}원` : `KRW ${Math.round(value).toLocaleString("en-US")}`;
