import { appEnv, hasOdsayApiKey, hasSupabaseConfig, hasTourApiKey } from "../config/env";
import { seedPlaces } from "../data/seed";
import {
  estimatedSpendFromPriceLevel,
  getStartAreaOrDefault,
  normalizeTripPreferences,
} from "../features/itinerary/planning";
import { buildFallbackItinerary, buildTransitLeg, validateStructuredItinerary } from "../features/itinerary/planner";
import { supabase } from "../lib/supabase";
import { AppLocale, GenerateItineraryResponse, Itinerary, Place, TransitLeg, TripPreferences } from "../types/domain";
import { logApiError, logApiRequest, logApiResponse, logDebugInfo, logPriceSnapshot } from "./debug-service";
import { fetchWeatherSnapshot } from "./weather-service";

const mapTourCategory = (contentTypeId?: string) => {
  switch (contentTypeId) {
    case "39":
      return ["food"] as const;
    case "14":
      return ["culture", "history"] as const;
    case "12":
      return ["photospot", "nature"] as const;
    default:
      return ["culture"] as const;
  }
};

const fetchVisitKoreaPlaces = async (): Promise<Place[]> => {
  const params = new URLSearchParams({
    MobileOS: "ETC",
    MobileApp: "BusanMate",
    areaCode: "6",
    numOfRows: "20",
    pageNo: "1",
    _type: "json",
    serviceKey: appEnv.tourApiKey,
  });
  const endpoint = "https://apis.data.go.kr/B551011/KorService2/areaBasedList2";
  const traceId = logApiRequest({
    label: "visit-korea.areaBasedList2",
    summary: "Fetching live Busan candidate places from VisitKorea.",
    payload: {
      endpoint,
      params: Object.fromEntries(params.entries()),
    },
  });

  try {
    const response = await fetch(`${endpoint}?${params.toString()}`);
    if (!response.ok) {
      throw new Error(`VisitKorea area list failed with status ${response.status}`);
    }

    const payload = await response.json();
    const items = payload?.response?.body?.items?.item;
    if (!Array.isArray(items)) {
      logApiResponse({
        label: "visit-korea.areaBasedList2",
        traceId,
        summary: "VisitKorea returned no usable items array.",
        payload,
      });
      return [];
    }

    const places: Place[] = items
      .filter((item) => item?.mapx && item?.mapy && item?.title)
      .map((item, index) => {
        const categories = [...mapTourCategory(item.contenttypeid)];

        return {
          id: `tour-${item.contentid ?? index}`,
          slug: String(item.title).toLowerCase().replace(/\s+/g, "-"),
          district: item.addr1 ?? "Busan",
          categories,
          name: {
            ko: item.title,
            en: item.title,
          },
          description: {
            ko: item.addr1 ?? "부산 관광 공공데이터 기반 추천 장소입니다.",
            en: item.addr1 ?? "Recommended from the Korea Tourism public dataset.",
          },
          signatureStory: {
            ko: item.addr1 ?? "공공 관광 데이터를 바탕으로 수집한 장소입니다.",
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
          priceLevel: "balanced" as const,
          estimatedSpendKrw: estimatedSpendFromPriceLevel("balanced", categories),
        };
      });

    logApiResponse({
      label: "visit-korea.areaBasedList2",
      traceId,
      summary: `Loaded ${places.length} candidate places from VisitKorea.`,
      payload: {
        count: places.length,
        sample: places.slice(0, 3),
      },
    });

    return places;
  } catch (error) {
    logApiError({
      label: "visit-korea.areaBasedList2",
      traceId,
      summary: "VisitKorea place fetch failed.",
      error,
    });
    throw error;
  }
};

const fetchOdsayTransit = async (
  from: Place,
  to: Place,
  mobilityMode: TripPreferences["mobilityMode"] = "mixed"
): Promise<TransitLeg | null> => {
  const params = new URLSearchParams({
    SX: String(from.coordinates.longitude),
    SY: String(from.coordinates.latitude),
    EX: String(to.coordinates.longitude),
    EY: String(to.coordinates.latitude),
    apiKey: appEnv.odsayApiKey,
  });
  const endpoint = "https://api.odsay.com/v1/api/searchPubTransPathT";
  const traceId = logApiRequest({
    label: "odsay.searchPubTransPathT",
    summary: "Fetching live transit leg from ODsay.",
    payload: {
      endpoint,
      from: from.name.en,
      to: to.name.en,
      mobilityMode,
      params: Object.fromEntries(params.entries()),
    },
  });

  try {
    const response = await fetch(`${endpoint}?${params.toString()}`);
    if (!response.ok) {
      logApiError({
        label: "odsay.searchPubTransPathT",
        traceId,
        summary: `ODsay returned status ${response.status}.`,
        error: new Error(`ODsay returned status ${response.status}`),
        payload: {
          from: from.name.en,
          to: to.name.en,
        },
      });
      return null;
    }

    const payload = await response.json();
    const firstPath = payload?.result?.path?.[0]?.info;
    if (!firstPath) {
      logApiResponse({
        label: "odsay.searchPubTransPathT",
        traceId,
        summary: "ODsay returned no candidate transit path.",
        payload,
      });
      return null;
    }

    const fallbackLeg = buildTransitLeg(from, to, "ko", "odsay", mobilityMode);
    const leg: TransitLeg = {
      ...fallbackLeg,
      durationMinutes: firstPath.totalTime ?? fallbackLeg.durationMinutes,
      distanceKm: Number(((firstPath.totalDistance ?? fallbackLeg.distanceKm * 1000) / 1000).toFixed(1)),
      estimatedFareKrw: firstPath.payment ?? fallbackLeg.estimatedFareKrw,
      summary: {
        ko: `${from.name.ko} -> ${to.name.ko} 실시간 대중교통`,
        en: `Live transit from ${from.name.en} to ${to.name.en}`,
      },
    };

    logApiResponse({
      label: "odsay.searchPubTransPathT",
      traceId,
      summary: `Transit leg resolved in ${leg.durationMinutes} min / ${leg.estimatedFareKrw} KRW.`,
      payload: leg,
    });

    return leg;
  } catch (error) {
    logApiError({
      label: "odsay.searchPubTransPathT",
      traceId,
      summary: "ODsay transit lookup failed.",
      error,
      payload: {
        from: from.name.en,
        to: to.name.en,
        mobilityMode,
      },
    });
    return null;
  }
};

const enrichTransitLegs = async (itinerary: Itinerary) => {
  if (!hasOdsayApiKey) {
    logDebugInfo({
      label: "odsay.searchPubTransPathT",
      summary: "ODsay API key is missing, so fallback transit legs are being used.",
      payload: {
        itineraryId: itinerary.id,
      },
    });
    return itinerary;
  }

  const days = await Promise.all(
    itinerary.days.map(async (day) => {
      const stops = await Promise.all(
        day.stops.map(async (stop, index) => {
          if (index === 0) {
            return stop;
          }

          const previous = day.stops[index - 1];
          const liveTransit = previous
            ? await fetchOdsayTransit(previous.place, stop.place, itinerary.preferences.mobilityMode).catch(
                () => null
              )
            : null;

          return {
            ...stop,
            transitFromPrevious: liveTransit ?? stop.transitFromPrevious,
          };
        })
      );

      return {
        ...day,
        stops,
      };
    })
  );

  return {
    ...itinerary,
    days,
  };
};

const fetchCandidatePlaces = async () => {
  if (!hasTourApiKey) {
    logDebugInfo({
      label: "visit-korea.areaBasedList2",
      summary: "Tour API key is missing, so seeded places are being used.",
      payload: {
        source: "seed",
      },
    });
    return seedPlaces;
  }

  const livePlaces = await fetchVisitKoreaPlaces().catch(() => []);
  if (livePlaces.length === 0) {
    logDebugInfo({
      label: "visit-korea.areaBasedList2",
      summary: "Falling back to seeded places because no live places were available.",
      payload: {
        source: "seed",
      },
    });
  }

  return livePlaces.length > 0 ? [...livePlaces, ...seedPlaces] : seedPlaces;
};

const collectPlanningWarnings = (itinerary: Itinerary) => {
  const warnings: string[] = [];
  const locale = itinerary.locale;

  if (itinerary.planningMeta.weatherSnapshot.status === "unavailable") {
    warnings.push(itinerary.planningMeta.weatherSnapshot.summary[locale]);
  }

  if (itinerary.planningMeta.budgetSummary.strategy === "minimum") {
    warnings.push(itinerary.planningMeta.budgetSummary.summary[locale]);
  }

  return warnings;
};

export const generateItinerary = async (
  preferences: TripPreferences
): Promise<GenerateItineraryResponse> => {
  const normalizedPreferences = normalizeTripPreferences(preferences);
  const warnings: string[] = [];
  const [places, weatherSnapshot] = await Promise.all([
    fetchCandidatePlaces().catch(() => {
      warnings.push("Tour API unavailable, using seeded Busan places.");
      return seedPlaces;
    }),
    fetchWeatherSnapshot({
      startAreaId: normalizedPreferences.startAreaId,
      travelDate: normalizedPreferences.travelDate,
    }),
  ]);

  if (hasSupabaseConfig && supabase) {
    const traceId = logApiRequest({
      label: "generate-itinerary",
      summary: "Sending itinerary generation payload to Supabase Edge Function.",
      payload: {
        preferences: normalizedPreferences,
        placesCount: places.length,
        startArea: getStartAreaOrDefault(normalizedPreferences.startAreaId),
        weatherSnapshot,
      },
    });

    const { data, error } = await supabase.functions.invoke("generate-itinerary", {
      body: {
        preferences: normalizedPreferences,
        places,
        startArea: getStartAreaOrDefault(normalizedPreferences.startAreaId),
        weatherSnapshot,
      },
    });

    if (!error && data) {
      const candidate = validateStructuredItinerary(data.itinerary ?? data);
      if (candidate.success) {
        const remoteItinerary = await enrichTransitLegs({
          ...candidate.data,
          source: "ai",
          syncStatus: "synced",
        });

        logApiResponse({
          label: "generate-itinerary",
          traceId,
          summary: "Supabase returned a valid itinerary payload.",
          payload: {
            response: data,
            itineraryId: remoteItinerary.id,
            days: remoteItinerary.days.length,
            source: remoteItinerary.source,
          },
        });
        logPriceSnapshot({
          label: "generate-itinerary.price",
          itinerary: remoteItinerary,
        });

        return {
          itinerary: remoteItinerary,
          usedFallback: false,
          warnings: [...new Set([...warnings, ...collectPlanningWarnings(remoteItinerary)])],
        };
      }

      logApiError({
        label: "generate-itinerary",
        traceId,
        summary: "Supabase returned data, but it did not match the itinerary schema.",
        error: candidate.error.flatten(),
        payload: {
          response: data,
        },
      });
    } else if (error) {
      warnings.push(error.message);
      logApiError({
        label: "generate-itinerary",
        traceId,
        summary: "Supabase itinerary generation failed.",
        error,
        payload: {
          preferences: normalizedPreferences,
          warning: error.message,
        },
      });
    }
  } else {
    logDebugInfo({
      label: "generate-itinerary",
      summary: "Supabase is not configured, so local itinerary planning is being used.",
      payload: {
        preferences: normalizedPreferences,
      },
    });
  }

  const fallback = await enrichTransitLegs(
    buildFallbackItinerary(normalizedPreferences, places, {
      startArea: getStartAreaOrDefault(normalizedPreferences.startAreaId),
      weatherSnapshot,
    })
  );

  logDebugInfo({
    label: "generate-itinerary",
    summary: "Using local fallback itinerary planner.",
    payload: {
      warnings,
      itineraryId: fallback.id,
      days: fallback.days.length,
    },
  });
  logPriceSnapshot({
    label: "generate-itinerary.price",
    itinerary: fallback,
    summary: "Price snapshot for the fallback itinerary.",
  });

  return {
    itinerary: fallback,
    usedFallback: true,
    warnings: [
      ...new Set([
        ...warnings,
        ...collectPlanningWarnings(fallback),
        "Fallback planner used because remote AI was unavailable.",
      ]),
    ],
  };
};

export const getTransitRoute = async (from: Place, to: Place, locale: AppLocale = "ko") => {
  if (hasSupabaseConfig && supabase) {
    const traceId = logApiRequest({
      label: "get-transit-route",
      summary: "Requesting transit route from Supabase Edge Function.",
      payload: {
        from,
        to,
        locale,
      },
    });

    const { data, error } = await supabase.functions.invoke("get-transit-route", {
      body: {
        from,
        to,
        locale,
      },
    });

    if (!error && data) {
      logApiResponse({
        label: "get-transit-route",
        traceId,
        summary: "Supabase returned a transit route.",
        payload: data,
      });
      return data as TransitLeg;
    }

    if (error) {
      logApiError({
        label: "get-transit-route",
        traceId,
        summary: "Supabase transit route lookup failed. Falling back to local providers.",
        error,
        payload: {
          from: from.name.en,
          to: to.name.en,
          locale,
        },
      });
    }
  } else {
    logDebugInfo({
      label: "get-transit-route",
      summary: "Supabase is not configured, so local transit lookup is being used.",
      payload: {
        from: from.name.en,
        to: to.name.en,
        locale,
      },
    });
  }

  return (await fetchOdsayTransit(from, to)) ?? buildTransitLeg(from, to, locale);
};
