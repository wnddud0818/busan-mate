# Busan Mate

Busan Mate is an Expo Prebuild React Native MVP for AI-assisted Busan trip planning with live guidance, bilingual UI, local-first fallbacks, and Supabase-ready backend contracts.

## Stack

- Expo Prebuild + TypeScript + Expo Router
- TanStack Query + Zustand
- React Hook Form + Zod
- Supabase Auth / Database / Edge Functions
- Expo Location + Task Manager + Notifications

## Quick Start

```bash
pnpm install
cp .env.example .env
pnpm start
```

## Environment

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `EXPO_PUBLIC_OPENAI_MODEL`
- `EXPO_PUBLIC_TOUR_API_KEY`
- `EXPO_PUBLIC_ODSAY_API_KEY`
- `EXPO_PUBLIC_ODSAY_API_KEY_ANDROID` (optional)
- `EXPO_PUBLIC_ODSAY_API_KEY_IOS` (optional)

If keys are missing, the app automatically falls back to seeded Busan data and local itinerary generation.

## Commands

```bash
pnpm typecheck
pnpm test
pnpm prebuild
```

## Supabase

- SQL migration: `supabase/migrations/20260406190000_init.sql`
- Edge functions:
  - `generate-itinerary`
  - `get-transit-route`
  - `answer-guide`
  - `ingest-location-event`
  - `publish-itinerary`
  - `materialize-ranking`
