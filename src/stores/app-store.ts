import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { seedRanking, seedSharedRoutes } from "../data/seed";
import { buildSharedSnapshot, materializeRanking } from "../features/ranking/scoring";
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
  };
}

const persistStorage = createJSONStorage(() => AsyncStorage);

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
          set((state) => ({
            itineraries: [itinerary, ...state.itineraries.filter((item) => item.id !== itinerary.id)],
          })),
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
          set((state) => ({ locationEvents: [event, ...state.locationEvents].slice(0, 200) })),
        addChatMessage: (message) =>
          set((state) => ({ chatMessages: [...state.chatMessages, message] })),
        publishItineraryLocally: (itineraryId) => {
          const itinerary = get().itineraries.find((item) => item.id === itineraryId);
          if (!itinerary) {
            return undefined;
          }

          const shared = buildSharedSnapshot({
            ...itinerary,
            shareStatus: "published",
          });

          set((state) => ({
            itineraries: state.itineraries.map((item) =>
              item.id === itineraryId ? { ...item, shareStatus: "published" } : item
            ),
            sharedItineraries: [
              shared,
              ...state.sharedItineraries.filter((item) => item.itineraryId !== itineraryId),
            ],
          }));

          get().actions.refreshRankings();
          return shared;
        },
        applyRating: (itineraryId, rating) =>
          set((state) => ({
            itineraries: state.itineraries.map((item) =>
              item.id === itineraryId
                ? { ...item, ratingAverage: Number(((item.ratingAverage + rating) / 2).toFixed(1)) }
                : item
            ),
          })),
        refreshRankings: () =>
          set((state) => ({
            rankings: materializeRanking(state.sharedItineraries, state.locationEvents),
          })),
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
