import { Itinerary, UserProfile } from "../../types/domain";

const buildItinerary = (): Itinerary => ({
  id: "itinerary-1",
  syncStatus: "synced",
  routeSlug: "itinerary-1",
  title: { ko: "테스트 경로", en: "Test route" },
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
            signatureStory: { ko: "이야기", en: "Story" },
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
  ratingAverage: 4.2,
  estimatedBudgetLabel: { ko: "1인 7만-12만원", en: "KRW 70k-120k per person" },
});

const remoteProfile: UserProfile = {
  id: "auth-1",
  authUserId: "auth-1",
  profileId: "profile-1",
  isAnonymous: false,
  authMode: "supabase",
};

describe("remote sync services", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    jest.resetModules();
    process.env.EXPO_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = "anon-key";
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    jest.clearAllMocks();
    jest.dontMock("expo-secure-store");
    jest.dontMock("../../lib/supabase");
  });

  it("bootstraps Supabase auth by ensuring a remote profile row", async () => {
    const single = jest.fn().mockResolvedValue({
      data: {
        id: "profile-1",
      },
      error: null,
    });
    const select = jest.fn(() => ({ single }));
    const upsert = jest.fn(() => ({ select }));
    const from = jest.fn(() => ({ upsert }));
    const getSession = jest.fn().mockResolvedValue({
      data: {
        session: {
          user: {
            id: "auth-1",
            email: "mate@example.com",
            is_anonymous: false,
          },
        },
      },
    });

    jest.doMock("expo-secure-store", () => ({
      getItemAsync: jest.fn().mockResolvedValue(null),
      setItemAsync: jest.fn().mockResolvedValue(undefined),
    }));
    jest.doMock("../../lib/supabase", () => ({
      supabase: {
        auth: {
          getSession,
          signInAnonymously: jest.fn(),
        },
        from,
      },
    }));

    const { bootstrapAuth } = require("../auth-service") as typeof import("../auth-service");
    const profile = await bootstrapAuth("en");

    expect(from).toHaveBeenCalledWith("profiles");
    expect(profile.authUserId).toBe("auth-1");
    expect(profile.profileId).toBe("profile-1");
  });

  it("keeps a pending local publish snapshot when remote sync fails", async () => {
    jest.doMock("../../lib/supabase", () => ({
      supabase: {
        functions: {
          invoke: jest.fn().mockResolvedValue({
            data: null,
            error: {
              message: "publish failed",
            },
          }),
        },
      },
    }));

    const { publishItinerary } = require("../publish-service") as typeof import("../publish-service");
    const result = await publishItinerary({
      itinerary: buildItinerary(),
      userProfile: remoteProfile,
    });

    expect(result.syncStatus).toBe("pending");
    expect(result.itinerary.syncStatus).toBe("pending");
    expect(result.shared.syncStatus).toBe("pending");
  });

  it("keeps a pending local rating update when remote sync fails", async () => {
    jest.doMock("../../lib/supabase", () => ({
      supabase: {
        functions: {
          invoke: jest.fn().mockResolvedValue({
            data: null,
            error: {
              message: "rating failed",
            },
          }),
        },
      },
    }));

    const { rateItinerary } = require("../rating-service") as typeof import("../rating-service");
    const result = await rateItinerary({
      itinerary: buildItinerary(),
      rating: 5,
      userProfile: remoteProfile,
    });

    expect(result.syncStatus).toBe("pending");
    expect(result.itinerary.syncStatus).toBe("pending");
    expect(result.itinerary.ratingAverage).toBeGreaterThan(4.2);
  });
});
