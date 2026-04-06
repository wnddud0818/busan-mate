import { getLocales } from "expo-localization";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import { resources } from "../features/i18n/resources";
import { normalizeLocale } from "../utils/localized";

if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    compatibilityJSON: "v4",
    resources,
    lng: normalizeLocale(getLocales()[0]?.languageCode),
    fallbackLng: "ko",
    interpolation: {
      escapeValue: false,
    },
  });
}

export default i18n;
