import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { seedRanking, seedSharedRoutes } from "../data/seed";
import { buildSharedSnapshot, computeRankingScore, materializeRanking } from "../features/ranking/scoring";
import {
  AppLocale,
  ChatMessage,
  Itinerary,
  LocationEvent,
  RankingSnapshot,
  SharedItinerary,
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
  actions: {
    markHydrated: () => void;
    setLocale: (locale: AppLocale) => void;
    completeOnboarding: () => void;
    setUserProfile: (profile: UserProfile) => void;
    upsertItinerary: (itinerary: Itinerary) => void;
    setNotices: (notices: string[]) => void;
    startSession: (itinerary: Itinerary) => TripSession;
    updateSession: (session: TripSession) => void;
    setLocationConsent: (enabled: boolean) => void;
    addLocationEvent: (event: LocationEvent) => void;
    addChatMessage: (message: ChatMessage) => void;
    publishItineraryLocally: (itineraryId: string) => SharedItinerary | undefined;
    applyRating: (itineraryId: string, rating: number) => void;
    refreshRankings: () => void;
    restoreTrackingState: (payload: TrackingStatePayload | null) => void;
  };
}

const persistStorage = createJSONStorage(() => AsyncStorage);

const syncSharedSnapshot = (
  itinerary: Itinerary,
  existingShared?: SharedItinerary
): SharedItinerary => {
  const baseSnapshot = buildSharedSnapshot({
    ...itinerary,
    shareStatus: "published",
  });
  const currentTravelers = existingShared?.currentTravelers ?? baseSnapshot.currentTravelers;

  return {
    ...baseSnapshot,
    id: existingShared?.id ?? baseSnapshot.id,
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
      actions: {
        markHydrated: () => set({ hydrated: true }),
        setLocale: (locale) => set({ locale }),
        completeOnboarding: () => set({ onboardingComplete: true }),
        setUserProfile: (profile) => set({ userProfile: profile }),
        upsertItinerary: (itinerary) =>
          set((state) => {
            const itineraries = [itinerary, ...state.itineraries.filter((item) => item.id !== itinerary.id)];
            return {
              itineraries,
              ...syncPublishedCollections({
                itineraries,
                sharedItineraries: state.sharedItineraries,
                locationEvents: state.locationEvents,
              }),
            };
          }),
        setNotices: (notices) => set({ notices }),
        startSession: (itinerary) => {
          const session: TripSession = {
            id: `trip-${itinerary.id.slice(0, 6)}-${createId(5)}`,
            itineraryId: itinerary.id,
            currentDay: 1,
            currentStopOrder: 1,
            startedAt: new Date().toISOString(),
            status: "active",
            locationConsent: get().locationConsent,
            locale: itinerary.locale,
          };

          set({ activeSession: session });
          return session;
        },
        updateSession: (session) => set({ activeSession: session }),
        setLocationConsent: (enabled) => set({ locationConsent: enabled }),
        addLocationEvent: (event) =>
          set((state) => {
            const locationEvents = [event, ...state.locationEvents].slice(0, 200);
            return {
              locationEvents,
              rankings: materializeRanking(state.sharedItineraries, locationEvents),
            };
          }),
        addChatMessage: (message) =>
          set((state) => ({ chatMessages: [...state.chatMessages, message] })),
        publishItineraryLocally: (itineraryId) => {
          const itinerary = get().itineraries.find((item) => item.id === itineraryId);
          if (!itinerary) {
            return undefined;
          }

          const nextItinerary: Itinerary = {
            ...itinerary,
            shareStatus: "published",
          };
          const shared = syncSharedSnapshot(
            nextItinerary,
            get().sharedItineraries.find((item) => item.itineraryId === itineraryId)
          );

          set((state) => {
            const sharedItineraries = [
              shared,
              ...state.sharedItineraries.filter((item) => item.itineraryId !== itineraryId),
            ];

            return {
              itineraries: state.itineraries.map((item) =>
                item.id === itineraryId ? nextItinerary : item
              ),
              sharedItineraries,
              rankings: materializeRanking(sharedItineraries, state.locationEvents),
            };
          });
          return shared;
        },
        applyRating: (itineraryId, rating) =>
          set((state) => {
            const safeRating = Math.max(1, Math.min(5, rating));
            const itineraries = state.itineraries.map((item) =>
              item.id === itineraryId
                ? { ...item, ratingAverage: Number(((item.ratingAverage + safeRating) / 2).toFixed(1)) }
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

            const itineraries = [
              payload.itinerary,
              ...state.itineraries.filter((item) => item.id !== payload.itinerary.id),
            ];

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
