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

If keys are missing, the app automatically falls back to seeded Busan data and local itinerary generation.

## Commands

```bash
pnpm typecheck
pnpm test
pnpm build:web
pnpm prebuild
```

## Web Deployment

The app already supports Expo Web and can be exported as static assets.

```bash
pnpm build:web
```

Deploy the generated `web-dist/` folder to a static host such as Vercel, Netlify, or Cloudflare Pages.

## Supabase

- SQL migration: `supabase/migrations/20260406190000_init.sql`
- Edge functions:
  - `generate-itinerary`
  - `get-transit-route`
  - `answer-guide`
  - `ingest-location-event`
  - `publish-itinerary`
  - `materialize-ranking`
