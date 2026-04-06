export type AppLocale = "ko" | "en";

export type CompanionType = "solo" | "couple" | "family" | "friends";
export type BudgetLevel = "value" | "balanced" | "premium";
export type MobilityMode = "transit" | "walk" | "mixed";
export type InterestTag =
  | "food"
  | "culture"
  | "nature"
  | "photospot"
  | "shopping"
  | "history"
  | "night"
  | "healing";

export interface LocalizedText {
  ko: string;
  en: string;
}

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface Place {
  id: string;
  slug: string;
  district: string;
  categories: InterestTag[];
  name: LocalizedText;
  description: LocalizedText;
  signatureStory: LocalizedText;
  coordinates: Coordinates;
  indoor: boolean;
  accessibility: boolean;
  recommendedStayMinutes: number;
  bookingLabel?: LocalizedText;
  bookingUrl?: string;
  popularity: number;
  crowdBase: number;
  priceLevel: BudgetLevel;
}

export interface RouteStep {
  mode: "walk" | "bus" | "metro" | "taxi";
  label: LocalizedText;
}

export interface NavigationLinks {
  appleMaps: string;
  googleMaps: string;
  naverMap: string;
  kakaoMap: string;
  tMap: string;
}

export interface TransitLeg {
  fromPlaceId: string;
  toPlaceId: string;
  summary: LocalizedText;
  durationMinutes: number;
  distanceKm: number;
  provider: "odsay" | "fallback";
  steps: RouteStep[];
  navigationLinks: NavigationLinks;
}

export interface ItineraryStop {
  id: string;
  order: number;
  date: string;
  startTime: string;
  endTime: string;
  highlight: LocalizedText;
  note: LocalizedText;
  place: Place;
  transitFromPrevious?: TransitLeg;
}

export interface ItineraryDay {
  dayNumber: number;
  theme: LocalizedText;
  stops: ItineraryStop[];
}

export interface TripPreferences {
  tripDays: number;
  companionType: CompanionType;
  interests: InterestTag[];
  budgetLevel: BudgetLevel;
  mobilityMode: MobilityMode;
  accessibilityNeeds: boolean;
  indoorFallback: boolean;
  locale: AppLocale;
  startDistrict: string;
}

export interface Itinerary {
  id: string;
  routeSlug: string;
  title: LocalizedText;
  summary: LocalizedText;
  createdAt: string;
  locale: AppLocale;
  source: "ai" | "fallback";
  shareStatus: "private" | "published";
  preferences: TripPreferences;
  days: ItineraryDay[];
  ratingAverage: number;
  estimatedBudgetLabel: LocalizedText;
}

export interface TripSession {
  id: string;
  itineraryId: string;
  currentDay: number;
  currentStopOrder: number;
  startedAt: string;
  status: "idle" | "active" | "paused" | "completed";
  locationConsent: boolean;
  locale: AppLocale;
  lastAlertAt?: string;
}

export interface LocationEvent {
  id: string;
  tripSessionId: string;
  capturedAt: string;
  geohash: string | null;
  consented: boolean;
}

export interface SharedItinerary {
  id: string;
  itineraryId: string;
  title: LocalizedText;
  summary: LocalizedText;
  heroPlaceName: LocalizedText;
  tags: InterestTag[];
  ratingAverage: number;
  currentTravelers: number;
  score: number;
}

export interface RankingSnapshot {
  id: string;
  itineraryId?: string;
  title: LocalizedText;
  summary: LocalizedText;
  highlight: LocalizedText;
  tags: InterestTag[];
  score: number;
  currentTravelers: number;
}

export interface ChatMessage {
  id: string;
  itineraryId: string;
  sessionId?: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

export interface GuideAnswer {
  answer: string;
  suggestions: string[];
  citations: string[];
  confidence: "high" | "medium" | "fallback";
}

export interface GuideContext {
  itinerary: Itinerary;
  stop: ItineraryStop;
  locale: AppLocale;
}

export interface BookingLink {
  placeId: string;
  provider: string;
  label: LocalizedText;
  url: string;
}

export interface UserProfile {
  id: string;
  isAnonymous: boolean;
  email?: string;
  authMode: "local" | "supabase";
}

export interface GenerateItineraryResponse {
  itinerary: Itinerary;
  usedFallback: boolean;
  warnings: string[];
}

export interface PublishResult {
  shared: SharedItinerary;
  upgradeRequired: boolean;
}
