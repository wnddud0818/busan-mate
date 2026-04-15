import { differenceInCalendarDays, format, parseISO, startOfDay } from "date-fns";

import { getStartAreaOrDefault, isIsoDate } from "../features/itinerary/planning";
import { StartAreaId, WeatherRouteSignal, WeatherSnapshot } from "../types/domain";

const FORECAST_ENDPOINT = "https://api.open-meteo.com/v1/forecast";
const FORECAST_WINDOW_DAYS = 16;

const rainyCodes = new Set([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99]);
const clearCodes = new Set([0, 1]);

const unavailableSnapshot = (travelDate: string, reason?: "range" | "fetch"): WeatherSnapshot => ({
  status: "unavailable",
  source: "fallback",
  date: travelDate,
  signal: "mixed",
  summary:
    reason === "range"
      ? {
          ko: "선택한 날짜는 예보 범위를 벗어나 중립 경로로 추천했어요.",
          en: "That date is outside the forecast window, so we used a neutral route.",
        }
      : {
          ko: "날씨 예보를 불러오지 못해 중립 경로로 추천했어요.",
          en: "Forecast unavailable, so we used a neutral route.",
        },
});

const summarizeSignal = (signal: WeatherRouteSignal): WeatherSnapshot["summary"] => {
  switch (signal) {
    case "rainy":
      return {
        ko: "비 예보로 실내 비중을 높였어요.",
        en: "Rain is expected, so we shifted the route indoors.",
      };
    case "clear":
      return {
        ko: "맑은 날씨라 바다와 포토스팟 비중을 높였어요.",
        en: "Clear weather lets us lean into scenic outdoor stops.",
      };
    case "heat":
      return {
        ko: "더위 예보를 반영해 실내와 쉬어가기 동선을 강화했어요.",
        en: "Hot weather pushes the route toward indoor and recovery stops.",
      };
    case "cold":
      return {
        ko: "쌀쌀한 날씨를 고려해 실내 비중을 조금 더 높였어요.",
        en: "Cool weather nudges the route toward indoor comfort stops.",
      };
    default:
      return {
        ko: "무난한 날씨라 실내외를 균형 있게 섞었어요.",
        en: "Mild weather supports a balanced indoor and outdoor mix.",
      };
  }
};

const normalizeSignal = ({
  weatherCode,
  temperatureMaxC,
  temperatureMinC,
  precipitationProbabilityMax,
}: {
  weatherCode: number;
  temperatureMaxC: number;
  temperatureMinC: number;
  precipitationProbabilityMax: number;
}): WeatherRouteSignal => {
  if (rainyCodes.has(weatherCode) || precipitationProbabilityMax >= 55) {
    return "rainy";
  }

  if (temperatureMaxC >= 30) {
    return "heat";
  }

  if (temperatureMinC <= 5) {
    return "cold";
  }

  if (clearCodes.has(weatherCode) && precipitationProbabilityMax <= 20) {
    return "clear";
  }

  return "mixed";
};

export const fetchWeatherSnapshot = async ({
  startAreaId,
  travelDate,
}: {
  startAreaId: StartAreaId;
  travelDate: string;
}): Promise<WeatherSnapshot> => {
  if (!isIsoDate(travelDate)) {
    return unavailableSnapshot(format(new Date(), "yyyy-MM-dd"));
  }

  const targetDate = parseISO(travelDate);
  const offsetDays = differenceInCalendarDays(startOfDay(targetDate), startOfDay(new Date()));
  if (offsetDays < 0 || offsetDays >= FORECAST_WINDOW_DAYS) {
    return unavailableSnapshot(travelDate, "range");
  }

  const startArea = getStartAreaOrDefault(startAreaId);
  const params = new URLSearchParams({
    latitude: String(startArea.coordinates.latitude),
    longitude: String(startArea.coordinates.longitude),
    daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max",
    timezone: "Asia/Seoul",
    forecast_days: String(FORECAST_WINDOW_DAYS),
  });

  try {
    const response = await fetch(`${FORECAST_ENDPOINT}?${params.toString()}`);
    if (!response.ok) {
      throw new Error("Forecast request failed");
    }

    const payload = await response.json();
    const dates = payload?.daily?.time;
    const index = Array.isArray(dates) ? dates.indexOf(travelDate) : -1;

    if (index === -1) {
      return unavailableSnapshot(travelDate, "range");
    }

    const weatherCode = Number(payload.daily.weather_code?.[index] ?? 0);
    const temperatureMaxC = Number(payload.daily.temperature_2m_max?.[index] ?? 0);
    const temperatureMinC = Number(payload.daily.temperature_2m_min?.[index] ?? 0);
    const precipitationProbabilityMax = Number(
      payload.daily.precipitation_probability_max?.[index] ?? 0
    );
    const signal = normalizeSignal({
      weatherCode,
      temperatureMaxC,
      temperatureMinC,
      precipitationProbabilityMax,
    });

    return {
      status: "live",
      source: "open-meteo",
      date: travelDate,
      signal,
      summary: summarizeSignal(signal),
      weatherCode,
      temperatureMaxC,
      temperatureMinC,
      precipitationProbabilityMax,
    };
  } catch {
    return unavailableSnapshot(travelDate, "fetch");
  }
};
