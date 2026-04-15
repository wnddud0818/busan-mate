import AsyncStorage from "@react-native-async-storage/async-storage";

import { Itinerary, LocationEvent, TripSession } from "../../types/domain";

let useAppStore: typeof import("../app-store").useAppStore;

const buildItinerary = (): Itinerary => ({
  id: "itinerary-1",
  syncStatus: "synced",
  routeSlug: "itinerary-1",
  title: { ko: "테스트 루트", en: "Test route" },
  summary: { ko: "테스트 요약", en: "Test summary" },
  createdAt: "2026-04-15T09:00:00.000Z",
  locale: "ko",
  source: "fallback",
  shareStatus: "private",
  preferences: {
    tripDays: 1,
    companionType: "friends",
    interests: ["food", "night"],
    budgetLevel: "balanced",
    mobilityMode: "mixed",
    accessibilityNeeds: false,
    indoorFallback: false,
    locale: "ko",
    startDistrict: "Seomyeon",
  },
  days: [
    {
      dayNumber: 1,
      theme: { ko: "테스트 데이", en: "Test day" },
      stops: [
        {
          id: "stop-1",
          order: 1,
          date: "2026-04-15",
          startTime: "2026-04-15T09:00:00.000Z",
          endTime: "2026-04-15T10:00:00.000Z",
          highlight: { ko: "하이라이트", en: "Highlight" },
          note: { ko: "노트", en: "Note" },
          place: {
            id: "place-1",
            slug: "place-1",
            district: "Haeundae-gu",
            categories: ["food", "night"],
            name: { ko: "장소", en: "Place" },
            description: { ko: "설명", en: "Description" },
            signatureStory: { ko: "스토리", en: "Story" },
            coordinates: { latitude: 35.1, longitude: 129.1 },
            indoor: true,
            accessibility: true,
            recommendedStayMinutes: 60,
            popularity: 90,
            crowdBase: 50,
            priceLevel: "balanced",
          },
        },
      ],
    },
  ],
  ratingAverage: 4,
  estimatedBudgetLabel: { ko: "1인 7만~12만 원", en: "KRW 70k-120k per person" },
});

const buildSession = (): TripSession => ({
  id: "trip-itiner-abcde",
  syncStatus: "synced",
  itineraryId: "itinerary-1",
  currentDay: 1,
  currentStopOrder: 1,
  startedAt: "2026-04-15T09:00:00.000Z",
  status: "active",
  locationConsent: true,
  locale: "ko",
});

const buildLocationEvent = (): LocationEvent => ({
  id: "event-1",
  syncStatus: "synced",
  tripSessionId: "trip-itiner-abcde",
  capturedAt: "2026-04-15T09:30:00.000Z",
  geohash: null,
  consented: true,
});

describe("app store state sync", () => {
  beforeEach(async () => {
    jest.resetModules();
    await AsyncStorage.clear();
    useAppStore = require("../app-store").useAppStore;
  });

  it("keeps published snapshots and rankings in sync when a rating changes", () => {
    const itinerary = buildItinerary();

    useAppStore.getState().actions.upsertItinerary(itinerary);
    useAppStore.getState().actions.publishItineraryLocally(itinerary.id);
    useAppStore.getState().actions.applyRating(itinerary.id, 5);

    const published = useAppStore
      .getState()
      .sharedItineraries.find((item) => item.itineraryId === itinerary.id);
    const ranking = useAppStore
      .getState()
      .rankings.find((item) => item.itineraryId === itinerary.id);

    expect(published?.ratingAverage).toBe(4.5);
    expect(ranking?.itineraryId).toBe(itinerary.id);
    expect(ranking?.score ?? 0).toBeGreaterThan(0);
  });

  it("restores a saved tracking session and keeps the itinerary available", () => {
    const itinerary = buildItinerary();
    const session = buildSession();

    useAppStore.getState().actions.restoreTrackingState({
      itinerary,
      session,
    });

    expect(useAppStore.getState().activeSession?.id).toBe(session.id);
    expect(useAppStore.getState().locationConsent).toBe(true);
    expect(useAppStore.getState().itineraries[0]?.id).toBe(itinerary.id);
  });

  it("marks the active session completed after advancing past the final stop", () => {
    const itinerary = buildItinerary();
    const session = buildSession();

    useAppStore.getState().actions.restoreTrackingState({
      itinerary,
      session,
    });

    const advanced = useAppStore.getState().actions.advanceSession();

    expect(advanced?.status).toBe("completed");
    expect(useAppStore.getState().activeSession?.status).toBe("completed");
  });

  it("recomputes rankings when a live location event is added", () => {
    const itinerary = buildItinerary();

    useAppStore.getState().actions.upsertItinerary(itinerary);
    useAppStore.getState().actions.publishItineraryLocally(itinerary.id);

    const before =
      useAppStore
        .getState()
        .rankings.find((item) => item.itineraryId === itinerary.id)?.currentTravelers ?? 0;
    useAppStore.getState().actions.addLocationEvent(buildLocationEvent());
    const after =
      useAppStore
        .getState()
        .rankings.find((item) => item.itineraryId === itinerary.id)?.currentTravelers ?? 0;

    expect(after).toBeGreaterThan(before);
  });
});
