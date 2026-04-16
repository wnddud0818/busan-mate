import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";

const { createJSONStorage, persist } = require("zustand/middleware") as typeof import("zustand/middleware");

import { seedRanking, seedSharedRoutes } from "../data/seed";
import { buildSharedSnapshot, computeRankingScore, materializeRanking } from "../features/ranking/scoring";
import {
  AppLocale,
  ChatMessage,
  DebugLogEntry,
  Itinerary,
  LocationEvent,
  RankingSnapshot,
  SharedItinerary,
  SyncStatus,
  TripSession,
  UserProfile,
} from "../types/domain";
import { createId } from "../utils/id";

type TrackingStatePayload = {
  itinerary: Itinerary;
  session: TripSession;
};

interface AppState {
  hydrated: boolean;
  locale: AppLocale;
  onboardingComplete: boolean;
  userProfile?: UserProfile;
  itineraries: Itinerary[];
  sharedItineraries: SharedItinerary[];
  rankings: RankingSnapshot[];
  locationConsent: boolean;
  activeSession?: TripSession;
  locationEvents: LocationEvent[];
  chatMessages: ChatMessage[];
  notices: string[];
  debugLogs: DebugLogEntry[];
  actions: {
    markHydrated: () => void;
    setLocale: (locale: AppLocale) => void;
    completeOnboarding: () => void;
    setUserProfile: (profile: UserProfile) => void;
    upsertItinerary: (itinerary: Itinerary) => void;
    upsertSharedItinerary: (shared: SharedItinerary) => void;
    setRankings: (rankings: RankingSnapshot[]) => void;
    setNotices: (notices: string[]) => void;
    addDebugLog: (entry: DebugLogEntry) => void;
    clearDebugLogs: () => void;
    startSession: (itinerary: Itinerary) => TripSession;
    updateSession: (session: TripSession) => void;
    advanceSession: () => TripSession | undefined;
    completeSession: () => TripSession | undefined;
    setLocationConsent: (enabled: boolean) => void;
    addLocationEvent: (event: LocationEvent) => void;
    addChatMessage: (message: ChatMessage) => void;
    publishItineraryLocally: (itineraryId: string, syncStatus?: SyncStatus) => SharedItinerary | undefined;
    applyRating: (itineraryId: string, rating: number, syncStatus?: SyncStatus) => void;
    refreshRankings: () => void;
    restoreTrackingState: (payload: TrackingStatePayload | null) => void;
  };
}

const persistStorage = createJSONStorage(() => AsyncStorage);
const MAX_DEBUG_LOGS = 60;

const upsertFront = <T extends { id: string }>(items: T[], item: T) => [
  item,
  ...items.filter((candidate) => candidate.id !== item.id),
];

const upsertMessage = <T extends { id: string }>(items: T[], item: T) => {
  const existingIndex = items.findIndex((candidate) => candidate.id === item.id);
  if (existingIndex === -1) {
    return [...items, item];
  }

  return items.map((candidate) => (candidate.id === item.id ? item : candidate));
};

const syncSharedSnapshot = (itinerary: Itinerary, existingShared?: SharedItinerary): SharedItinerary => {
  const baseSnapshot = buildSharedSnapshot({
    ...itinerary,
    shareStatus: "published",
  });
  const currentTravelers = existingShared?.currentTravelers ?? baseSnapshot.currentTravelers;

  return {
    ...baseSnapshot,
    id: existingShared?.id ?? baseSnapshot.id,
    remoteId: existingShared?.remoteId ?? baseSnapshot.remoteId,
    syncStatus: itinerary.syncStatus,
    currentTravelers,
    score: computeRankingScore({
      ratingAverage: itinerary.ratingAverage,
      currentTravelers,
      seedBoost: 42,
    }),
  };
};

const syncPublishedCollections = ({
  itineraries,
  sharedItineraries,
  locationEvents,
}: Pick<AppState, "itineraries" | "sharedItineraries" | "locationEvents">) => {
  const nextSharedItineraries = sharedItineraries.map((sharedItinerary) => {
    const matchingItinerary = itineraries.find((itinerary) => itinerary.id === sharedItinerary.itineraryId);
    return matchingItinerary ? syncSharedSnapshot(matchingItinerary, sharedItinerary) : sharedItinerary;
  });

  return {
    sharedItineraries: nextSharedItineraries,
    rankings: materializeRanking(nextSharedItineraries, locationEvents),
  };
};

const createSessionDraft = (itinerary: Itinerary, locationConsent: boolean): TripSession => ({
  id: `trip-${itinerary.id.slice(0, 6)}-${createId(5)}`,
  itineraryId: itinerary.id,
  currentDay: 1,
  currentStopOrder: 1,
  startedAt: new Date().toISOString(),
  status: "active",
  locationConsent,
  locale: itinerary.locale,
  syncStatus: "pending",
});

const nextSessionStop = (session: TripSession, itinerary: Itinerary): TripSession => {
  const currentDay = itinerary.days[session.currentDay - 1];

  if (!currentDay) {
    return {
      ...session,
      status: "completed",
    };
  }

  if (session.currentStopOrder < currentDay.stops.length) {
    return {
      ...session,
      currentStopOrder: session.currentStopOrder + 1,
    };
  }

  if (session.currentDay < itinerary.days.length) {
    return {
      ...session,
      currentDay: session.currentDay + 1,
      currentStopOrder: 1,
    };
  }

  return {
    ...session,
    status: "completed",
  };
};

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      hydrated: false,
      locale: "ko",
      onboardingComplete: false,
      itineraries: [],
      sharedItineraries: seedSharedRoutes,
      rankings: seedRanking,
      locationConsent: false,
      locationEvents: [],
      chatMessages: [],
      notices: [],
      debugLogs: [],
      actions: {
        markHydrated: () => set({ hydrated: true }),
        setLocale: (locale) => set({ locale }),
        completeOnboarding: () => set({ onboardingComplete: true }),
        setUserProfile: (profile) => set({ userProfile: profile }),
        upsertItinerary: (itinerary) =>
          set((state) => {
            const itineraries = upsertFront(state.itineraries, itinerary);
            return {
              itineraries,
              ...syncPublishedCollections({
                itineraries,
                sharedItineraries: state.sharedItineraries,
                locationEvents: state.locationEvents,
              }),
            };
          }),
        upsertSharedItinerary: (shared) =>
          set((state) => {
            const sharedItineraries = upsertFront(state.sharedItineraries, shared);
            return {
              sharedItineraries,
              rankings: materializeRanking(sharedItineraries, state.locationEvents),
            };
          }),
        setRankings: (rankings) => set({ rankings }),
        setNotices: (notices) => set({ notices }),
        addDebugLog: (entry) =>
          set((state) => ({
            debugLogs: [entry, ...state.debugLogs].slice(0, MAX_DEBUG_LOGS),
          })),
        clearDebugLogs: () => set({ debugLogs: [] }),
        startSession: (itinerary) => {
          const session = createSessionDraft(itinerary, get().locationConsent);
          set({ activeSession: session });
          return session;
        },
        updateSession: (session) => set({ activeSession: session }),
        advanceSession: () => {
          const state = get();
          const activeSession = state.activeSession;
          const itinerary = state.itineraries.find((item) => item.id === activeSession?.itineraryId);

          if (!activeSession || !itinerary) {
            return undefined;
          }

          const nextSession = nextSessionStop(activeSession, itinerary);
          set({ activeSession: nextSession });
          return nextSession;
        },
        completeSession: () => {
          const activeSession = get().activeSession;
          if (!activeSession) {
            return undefined;
          }

          const nextSession: TripSession = {
            ...activeSession,
            status: "completed",
          };
          set({ activeSession: nextSession });
          return nextSession;
        },
        setLocationConsent: (enabled) => set({ locationConsent: enabled }),
        addLocationEvent: (event) =>
          set((state) => {
            const locationEvents = upsertFront(state.locationEvents, event).slice(0, 200);
            return {
              locationEvents,
              rankings: materializeRanking(state.sharedItineraries, locationEvents),
            };
          }),
        addChatMessage: (message) =>
          set((state) => ({ chatMessages: upsertMessage(state.chatMessages, message) })),
        publishItineraryLocally: (itineraryId, syncStatus = "synced") => {
          const itinerary = get().itineraries.find((item) => item.id === itineraryId);
          if (!itinerary) {
            return undefined;
          }

          const nextItinerary: Itinerary = {
            ...itinerary,
            shareStatus: "published",
            syncStatus,
          };
          const shared = syncSharedSnapshot(
            nextItinerary,
            get().sharedItineraries.find((item) => item.itineraryId === itineraryId)
          );

          set((state) => {
            const itineraries = state.itineraries.map((item) => (item.id === itineraryId ? nextItinerary : item));
            const sharedItineraries = upsertFront(
              state.sharedItineraries.filter((item) => item.itineraryId !== itineraryId),
              shared
            );

            return {
              itineraries,
              sharedItineraries,
              rankings: materializeRanking(sharedItineraries, state.locationEvents),
            };
          });
          return shared;
        },
        applyRating: (itineraryId, rating, syncStatus = "synced") =>
          set((state) => {
            const safeRating = Math.max(1, Math.min(5, rating));
            const itineraries = state.itineraries.map((item) =>
              item.id === itineraryId
                ? {
                    ...item,
                    syncStatus,
                    ratingAverage: Number(((item.ratingAverage + safeRating) / 2).toFixed(1)),
                  }
                : item
            );

            return {
              itineraries,
              ...syncPublishedCollections({
                itineraries,
                sharedItineraries: state.sharedItineraries,
                locationEvents: state.locationEvents,
              }),
            };
          }),
        refreshRankings: () =>
          set((state) => ({
            rankings: materializeRanking(state.sharedItineraries, state.locationEvents),
          })),
        restoreTrackingState: (payload) =>
          set((state) => {
            if (!payload) {
              return {};
            }

            const itineraries = upsertFront(state.itineraries, payload.itinerary);

            return {
              itineraries,
              activeSession: payload.session,
              locationConsent: payload.session.locationConsent,
              ...syncPublishedCollections({
                itineraries,
                sharedItineraries: state.sharedItineraries,
                locationEvents: state.locationEvents,
              }),
            };
          }),
      },
    }),
    {
      name: "busan-mate-store",
      storage: persistStorage,
      partialize: (state) => ({
        locale: state.locale,
        onboardingComplete: state.onboardingComplete,
        userProfile: state.userProfile,
        itineraries: state.itineraries,
        sharedItineraries: state.sharedItineraries,
        rankings: state.rankings,
        locationConsent: state.locationConsent,
        locationEvents: state.locationEvents,
        chatMessages: state.chatMessages,
      }),
      onRehydrateStorage: () => (state) => {
        state?.actions.markHydrated();
      },
    }
  )
);
