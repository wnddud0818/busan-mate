import { z } from "zod";

import { startAreaIds } from "../../data/start-areas";
import { isIsoDate } from "./planning";

export const localeSchema = z.enum(["ko", "en"]);
export const localizedTextSchema = z.object({
  ko: z.string().min(1),
  en: z.string().min(1),
});

export const tripPreferencesSchema = z.object({
  tripDays: z.number().int().min(1).max(5),
  totalBudgetKrw: z.number().int().min(30000),
  partySize: z.number().int().min(1).max(12),
  travelDate: z.string().refine(isIsoDate, "Invalid travel date"),
  startAreaId: z.enum(startAreaIds),
  companionType: z.enum(["solo", "couple", "family", "friends"]),
  interests: z
    .array(z.enum(["food", "culture", "nature", "photospot", "shopping", "history", "night", "healing"]))
    .min(1),
  budgetLevel: z.enum(["value", "balanced", "premium"]),
  mobilityMode: z.enum(["transit", "walk", "mixed"]),
  accessibilityNeeds: z.boolean(),
  indoorFallback: z.boolean(),
  includeLodgingCost: z.boolean(),
  locale: localeSchema,
});

const coordinatesSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
});

const placeSchema = z.object({
  id: z.string().min(1),
  slug: z.string().min(1),
  district: z.string().min(1),
  categories: z.array(
    z.enum(["food", "culture", "nature", "photospot", "shopping", "history", "night", "healing"])
  ),
  name: localizedTextSchema,
  description: localizedTextSchema,
  signatureStory: localizedTextSchema,
  coordinates: coordinatesSchema,
  indoor: z.boolean(),
  accessibility: z.boolean(),
  recommendedStayMinutes: z.number().int().positive(),
  bookingLabel: localizedTextSchema.optional(),
  bookingUrl: z.string().url().optional(),
  popularity: z.number(),
  crowdBase: z.number(),
  priceLevel: z.enum(["value", "balanced", "premium"]),
  estimatedSpendKrw: z.number().int().nonnegative(),
});

const navigationLinksSchema = z.object({
  appleMaps: z.string().url(),
  googleMaps: z.string().url(),
  naverMap: z.string().min(1),
  kakaoMap: z.string().min(1),
  tMap: z.string().min(1),
});

const transitLegSchema = z.object({
  fromPlaceId: z.string().min(1),
  toPlaceId: z.string().min(1),
  summary: localizedTextSchema,
  durationMinutes: z.number().nonnegative(),
  distanceKm: z.number().nonnegative(),
  estimatedFareKrw: z.number().int().nonnegative(),
  provider: z.enum(["odsay", "fallback"]),
  steps: z.array(
    z.object({
      mode: z.enum(["walk", "bus", "metro", "taxi"]),
      label: localizedTextSchema,
      detail: localizedTextSchema.optional(),
    })
  ),
  navigationLinks: navigationLinksSchema,
});

const itineraryStopSchema = z.object({
  id: z.string().min(1),
  order: z.number().int().nonnegative(),
  date: z.string().min(1),
  startTime: z.string().min(1),
  endTime: z.string().min(1),
  highlight: localizedTextSchema,
  note: localizedTextSchema,
  place: placeSchema,
  transitFromPrevious: transitLegSchema.optional(),
});

const startAreaSchema = z.object({
  id: z.enum(startAreaIds),
  name: localizedTextSchema,
  district: localizedTextSchema,
  coordinates: coordinatesSchema,
});

const weatherSnapshotSchema = z.object({
  status: z.enum(["live", "unavailable"]),
  source: z.enum(["open-meteo", "fallback"]),
  date: z.string().refine(isIsoDate, "Invalid weather date"),
  signal: z.enum(["clear", "mixed", "rainy", "heat", "cold"]),
  summary: localizedTextSchema,
  weatherCode: z.number().optional(),
  temperatureMaxC: z.number().optional(),
  temperatureMinC: z.number().optional(),
  precipitationProbabilityMax: z.number().optional(),
});

const budgetSummarySchema = z.object({
  totalBudgetKrw: z.number().int().nonnegative(),
  estimatedTotalKrw: z.number().int().nonnegative(),
  estimatedPerPersonKrw: z.number().int().nonnegative(),
  remainingBudgetKrw: z.number().int(),
  strategy: z.enum(["within", "minimum"]),
  summary: localizedTextSchema,
});

const lodgingSummarySchema = z.object({
  source: z.enum(["visit-korea", "fallback", "none"]),
  nights: z.number().int().nonnegative(),
  estimatedNightlyRateKrw: z.number().int().nonnegative(),
  estimatedRoomCount: z.number().int().nonnegative(),
  estimatedTotalKrw: z.number().int().nonnegative(),
  propertyName: localizedTextSchema.optional(),
  district: z.string().min(1).optional(),
  coordinates: coordinatesSchema.optional(),
  bookingUrl: z.string().url().optional(),
  checkInTime: z.string().min(1).optional(),
  checkOutTime: z.string().min(1).optional(),
  note: localizedTextSchema.optional(),
});

const plannerCandidateDebugSchema = z.object({
  placeId: z.string().min(1),
  name: localizedTextSchema,
  score: z.number(),
  estimatedSpendKrw: z.number().int().nonnegative(),
  priceLevel: z.enum(["value", "balanced", "premium"]),
  indoor: z.boolean(),
  accessibility: z.boolean(),
  distanceFromStartKm: z.number().nonnegative(),
  selected: z.boolean(),
  routeOrder: z.number().int().positive().optional(),
  selectionStage: z.enum(["final", "budget-selected", "trimmed", "not-selected"]),
  scoreBreakdown: z.record(z.string(), z.number()),
});

const plannerRouteLegDebugSchema = z.object({
  dayNumber: z.number().int().positive(),
  order: z.number().int().positive(),
  fromPlace: localizedTextSchema.optional(),
  toPlace: localizedTextSchema,
  durationMinutes: z.number().nonnegative().optional(),
  distanceKm: z.number().nonnegative().optional(),
  estimatedFareKrw: z.number().int().nonnegative().optional(),
  provider: z.enum(["odsay", "fallback"]).optional(),
});

const planningDebugSchema = z.object({
  engine: z.enum(["remote-ai", "local-fallback", "indoor-fallback"]),
  routeResolvedWithoutFallback: z.boolean(),
  withinBudget: z.boolean(),
  trimmedToBudget: z.boolean(),
  selectedStrategy: z.enum(["within", "minimum"]),
  targetStopCount: z.number().int().nonnegative(),
  minimumStopCount: z.number().int().nonnegative(),
  finalStopCount: z.number().int().nonnegative(),
  placesSource: z.enum(["live", "seed", "mixed"]),
  weatherSource: z.enum(["open-meteo", "fallback"]),
  liveTransitLegCount: z.number().int().nonnegative(),
  fallbackTransitLegCount: z.number().int().nonnegative(),
  weatherValues: weatherSnapshotSchema,
  candidatePlaces: z.array(plannerCandidateDebugSchema),
  routeLegs: z.array(plannerRouteLegDebugSchema),
  notes: z.array(z.string()),
});

const planningMetaSchema = z.object({
  startArea: startAreaSchema,
  weatherSnapshot: weatherSnapshotSchema,
  budgetSummary: budgetSummarySchema,
  lodging: lodgingSummarySchema.optional(),
  debug: planningDebugSchema.optional(),
});

export const itinerarySchema = z.object({
  id: z.string().min(1),
  remoteId: z.string().min(1).optional(),
  syncStatus: z.enum(["synced", "pending", "failed"]).default("synced"),
  routeSlug: z.string().min(1),
  title: localizedTextSchema,
  summary: localizedTextSchema,
  createdAt: z.string().min(1),
  locale: localeSchema,
  source: z.enum(["ai", "fallback"]),
  shareStatus: z.enum(["private", "published"]),
  preferences: tripPreferencesSchema,
  days: z.array(
    z.object({
      dayNumber: z.number().int().positive(),
      theme: localizedTextSchema,
      stops: z.array(itineraryStopSchema).min(1),
    })
  ),
  ratingAverage: z.number(),
  estimatedBudgetLabel: localizedTextSchema,
  planningMeta: planningMetaSchema,
});
