import { appEnv } from "../config/env";
import {
  CrowdForecastLevel,
  ItineraryCrowdForecast,
  ItineraryStop,
  Place,
  StopCrowdForecast,
} from "../types/domain";
import { logApiError, logApiRequest, logApiResponse, logDebugInfo } from "./debug-service";

const CROWD_ENDPOINT = "https://apis.data.go.kr/B551011/TatsCnctrRateService/tatsCnctrRatedList";
const BUSAN_AREA_CODE = "26";
const CROWD_PAGE_SIZE = 500;
const CROWD_SOURCE = "visit-korea" as const;

interface CrowdApiRow {
  baseYmd: string;
  signguCd: string;
  signguNm: string;
  tAtsNm: string;
  cnctrRate: number;
}

const DISTRICT_CODE_BY_PLACE_ID: Record<string, string> = {
  gamcheon: "26380",
  haeundae: "26350",
  gwangalli: "26500",
  huinnyeoul: "26200",
  jagalchi: "26110",
  "cinema-center": "26350",
  "museum-of-contemporary": "26380",
  haedong: "26710",
  songdo: "26140",
};

const DISTRICT_ALIASES: Array<{ code: string; tokens: string[] }> = [
  { code: "26110", tokens: ["junggu", "\uC911\uAD6C", "nampo", "nampodong"] },
  { code: "26140", tokens: ["seogu", "\uC11C\uAD6C", "songdo"] },
  { code: "26170", tokens: ["donggu", "\uB3D9\uAD6C"] },
  { code: "26200", tokens: ["yeongdogu", "\uC601\uB3C4\uAD6C"] },
  { code: "26230", tokens: ["busanjingu", "busanjin", "\uBD80\uC0B0\uC9C4\uAD6C", "seomyeon"] },
  { code: "26260", tokens: ["dongnaegu", "\uB3D9\uB798\uAD6C"] },
  { code: "26290", tokens: ["namgu", "\uB0A8\uAD6C"] },
  { code: "26320", tokens: ["bukgu", "\uBD81\uAD6C"] },
  { code: "26350", tokens: ["haeundaegu", "\uD574\uC6B4\uB300\uAD6C"] },
  { code: "26380", tokens: ["sahagu", "\uC0AC\uD558\uAD6C"] },
  { code: "26410", tokens: ["geumjeonggu", "\uAE08\uC815\uAD6C"] },
  { code: "26440", tokens: ["gangseogu", "\uAC15\uC11C\uAD6C"] },
  { code: "26470", tokens: ["yeonjegu", "\uC5F0\uC81C\uAD6C"] },
  { code: "26500", tokens: ["suyeonggu", "\uC218\uC601\uAD6C", "gwangalli"] },
  { code: "26530", tokens: ["sasanggu", "\uC0AC\uC0C1\uAD6C"] },
  { code: "26710", tokens: ["gijanggun", "\uAE30\uC7A5\uAD70", "osiria"] },
];

const PLACE_NAME_ALIASES: Record<string, string[]> = {
  haeundae: ["\uD574\uC6B4\uB300\uD574\uC218\uC695\uC7A5"],
  gwangalli: ["\uAD11\uC548\uB9AC\uD574\uC218\uC695\uC7A5"],
  jagalchi: ["\uBD80\uC0B0 \uC790\uAC08\uCE58\uC2DC\uC7A5", "\uC790\uAC08\uCE58\uC2DC\uC7A5"],
  "museum-of-contemporary": ["\uBD80\uC0B0\uD604\uB300\uBBF8\uC220\uAD00"],
  huinnyeoul: ["\uC601\uB3C4 \uD770\uC5EC\uC6B8\uD574\uC548\uD130\uB110", "\uD770\uC5EC\uC6B8"],
};

const createEmptyForecast = (totalStopCount: number): ItineraryCrowdForecast => ({
  source: CROWD_SOURCE,
  totalStopCount,
  matchedStopCount: 0,
  unavailableStopCount: totalStopCount,
  levelCounts: {
    low: 0,
    moderate: 0,
    high: 0,
  },
  stops: [],
});

const normalizeCrowdKey = (value: string) =>
  value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^0-9a-zA-Z\u3131-\u318E\uAC00-\uD7A3]/g, "");

const toArray = <T>(value: T | T[] | null | undefined): T[] => {
  if (Array.isArray(value)) {
    return value;
  }

  return value == null ? [] : [value];
};

const toDateKey = (isoDate: string) => isoDate.replace(/-/g, "");

export const crowdForecastLevelForRate = (rate: number): CrowdForecastLevel => {
  if (rate < 40) {
    return "low";
  }

  if (rate < 70) {
    return "moderate";
  }

  return "high";
};

export const resolveCrowdForecastDistrictCode = (place: Pick<Place, "id" | "district" | "name">) => {
  const overriddenCode = DISTRICT_CODE_BY_PLACE_ID[place.id];
  if (overriddenCode) {
    return overriddenCode;
  }

  const haystacks = [place.district, place.name.ko, place.name.en]
    .filter(Boolean)
    .map((value) => normalizeCrowdKey(value));

  const matchedDistrict = DISTRICT_ALIASES.find(({ tokens }) =>
    tokens.some((token) => haystacks.some((haystack) => haystack.includes(normalizeCrowdKey(token))))
  );

  return matchedDistrict?.code ?? null;
};

const buildPlaceMatchCandidates = (place: Pick<Place, "id" | "slug" | "name">) => {
  const names = [place.name.ko, place.name.en, place.slug, ...(PLACE_NAME_ALIASES[place.id] ?? [])];

  return Array.from(
    new Set(
      names
        .filter(Boolean)
        .map((name) => normalizeCrowdKey(name))
        .filter(Boolean)
    )
  );
};

const scoreMatch = (candidate: string, attraction: string) => {
  if (candidate === attraction) {
    return 3;
  }

  if (candidate.includes(attraction) || attraction.includes(candidate)) {
    return 2;
  }

  return 0;
};

export const findStopCrowdForecast = ({
  stop,
  districtCode,
  rows,
}: {
  stop: ItineraryStop;
  districtCode: string;
  rows: CrowdApiRow[];
}): StopCrowdForecast | null => {
  const dateKey = toDateKey(stop.date);
  const datedRows = rows.filter((row) => row.baseYmd === dateKey);
  if (datedRows.length === 0) {
    return null;
  }

  const candidates = buildPlaceMatchCandidates(stop.place);
  if (candidates.length === 0) {
    return null;
  }

  let bestRow: CrowdApiRow | null = null;
  let bestScore = 0;

  for (const row of datedRows) {
    const attractionKey = normalizeCrowdKey(row.tAtsNm);
    const candidateScore = candidates.reduce(
      (maxScore, candidate) => Math.max(maxScore, scoreMatch(candidate, attractionKey)),
      0
    );

    if (candidateScore > bestScore) {
      bestScore = candidateScore;
      bestRow = row;
    }

    if (bestScore === 3) {
      break;
    }
  }

  if (!bestRow || bestScore === 0) {
    return null;
  }

  return {
    stopId: stop.id,
    stopDate: stop.date,
    placeId: stop.place.id,
    placeName: stop.place.name,
    matchedAttractionName: bestRow.tAtsNm,
    districtCode,
    districtName: bestRow.signguNm,
    rate: bestRow.cnctrRate,
    level: crowdForecastLevelForRate(bestRow.cnctrRate),
    source: CROWD_SOURCE,
  };
};

const fetchDistrictCrowdRows = async (districtCode: string): Promise<CrowdApiRow[]> => {
  const traceId = logApiRequest({
    label: "visit-korea.tatsCnctrRatedList",
    summary: `Fetching crowd forecast rows for district ${districtCode}.`,
    payload: {
      endpoint: CROWD_ENDPOINT,
      areaCd: BUSAN_AREA_CODE,
      signguCd: districtCode,
      numOfRows: CROWD_PAGE_SIZE,
    },
  });

  try {
    const rows: CrowdApiRow[] = [];
    let pageNo = 1;
    let totalPages = 1;

    while (pageNo <= totalPages) {
      const params = new URLSearchParams({
        MobileOS: "ETC",
        MobileApp: "BusanMate",
        _type: "json",
        serviceKey: appEnv.tourApiKey,
        areaCd: BUSAN_AREA_CODE,
        signguCd: districtCode,
        numOfRows: String(CROWD_PAGE_SIZE),
        pageNo: String(pageNo),
      });

      const response = await fetch(`${CROWD_ENDPOINT}?${params.toString()}`);
      if (!response.ok) {
        throw new Error(`Crowd forecast request failed with status ${response.status}`);
      }

      const payload = await response.json();
      const body = payload?.response?.body;
      const pageRows = toArray(body?.items?.item)
        .map((item) => ({
          baseYmd: String(item?.baseYmd ?? ""),
          signguCd: String(item?.signguCd ?? districtCode),
          signguNm: String(item?.signguNm ?? ""),
          tAtsNm: String(item?.tAtsNm ?? ""),
          cnctrRate: Number(item?.cnctrRate ?? 0),
        }))
        .filter((item) => item.baseYmd && item.tAtsNm && Number.isFinite(item.cnctrRate));

      rows.push(...pageRows);

      const totalCount = Number(body?.totalCount ?? pageRows.length);
      totalPages = Math.max(1, Math.ceil(totalCount / CROWD_PAGE_SIZE));
      pageNo += 1;
    }

    logApiResponse({
      label: "visit-korea.tatsCnctrRatedList",
      traceId,
      summary: `Loaded ${rows.length} crowd forecast rows for district ${districtCode}.`,
      payload: {
        districtCode,
        count: rows.length,
      },
    });

    return rows;
  } catch (error) {
    logApiError({
      label: "visit-korea.tatsCnctrRatedList",
      traceId,
      summary: `Crowd forecast fetch failed for district ${districtCode}.`,
      error,
      payload: {
        districtCode,
      },
    });
    throw error;
  }
};

export const loadItineraryCrowdForecast = async ({
  stops,
}: {
  stops: ItineraryStop[];
}): Promise<ItineraryCrowdForecast> => {
  if (!appEnv.tourApiKey) {
    logDebugInfo({
      label: "visit-korea.tatsCnctrRatedList",
      summary: "Skipped crowd forecast fetch because the Tour API key is missing.",
    });
    return createEmptyForecast(stops.length);
  }

  if (stops.length === 0) {
    return createEmptyForecast(0);
  }

  const stopsWithDistrict = stops.map((stop) => ({
    stop,
    districtCode: resolveCrowdForecastDistrictCode(stop.place),
  }));
  const districtCodes = Array.from(
    new Set(stopsWithDistrict.map((item) => item.districtCode).filter((code): code is string => Boolean(code)))
  );

  if (districtCodes.length === 0) {
    return createEmptyForecast(stops.length);
  }

  const districtResults = await Promise.allSettled(
    districtCodes.map(async (districtCode) => [districtCode, await fetchDistrictCrowdRows(districtCode)] as const)
  );
  const rowsByDistrict = new Map<string, CrowdApiRow[]>();

  districtResults.forEach((result) => {
    if (result.status === "fulfilled") {
      const [districtCode, rows] = result.value;
      rowsByDistrict.set(districtCode, rows);
    }
  });

  const matchedStops = stopsWithDistrict
    .map(({ stop, districtCode }) =>
      districtCode ? findStopCrowdForecast({ stop, districtCode, rows: rowsByDistrict.get(districtCode) ?? [] }) : null
    )
    .filter((item): item is StopCrowdForecast => Boolean(item));

  const summary = matchedStops.reduce(
    (accumulator, item) => {
      accumulator.totalRate += item.rate;
      accumulator.levelCounts[item.level] += 1;

      if (!accumulator.busiestStop || item.rate > accumulator.busiestStop.rate) {
        accumulator.busiestStop = item;
      }

      if (!accumulator.calmestStop || item.rate < accumulator.calmestStop.rate) {
        accumulator.calmestStop = item;
      }

      return accumulator;
    },
    {
      totalRate: 0,
      busiestStop: undefined as StopCrowdForecast | undefined,
      calmestStop: undefined as StopCrowdForecast | undefined,
      levelCounts: {
        low: 0,
        moderate: 0,
        high: 0,
      } as Record<CrowdForecastLevel, number>,
    }
  );

  return {
    source: CROWD_SOURCE,
    totalStopCount: stops.length,
    matchedStopCount: matchedStops.length,
    unavailableStopCount: Math.max(0, stops.length - matchedStops.length),
    averageRate:
      matchedStops.length > 0 ? Number((summary.totalRate / matchedStops.length).toFixed(1)) : undefined,
    busiestStop: summary.busiestStop,
    calmestStop: summary.calmestStop,
    levelCounts: summary.levelCounts,
    stops: matchedStops,
  };
};
