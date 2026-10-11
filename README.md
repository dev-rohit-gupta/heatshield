# HeatShield

**Rider-first heat exposure awareness for outdoor delivery work.**

HeatShield is a software-only hackathon project. The planned MVP helps a rider monitor outdoor conditions, compare routes, record a work shift, and review estimated heat exposure.

> **Status: Step 1 - repository scaffold.** The mobile tabs render placeholder content. The health Lambda is the only implemented API. Weather, authentication, route analysis, tracking, scoring, persistence and AWS deployment are **not implemented yet**.

## Repository

```text
apps/
  mobile/          Expo SDK 57 + TypeScript + Expo Router (Android-first)
  api/             AWS Lambda handlers + service/repository boundaries
packages/
  shared/          API response/types shared across clients and backend
  heat-engine/     Isolated exposure calculation package (not implemented)
infrastructure/
  cdk/             AWS CDK infrastructure (placeholder only)
docs/             Architecture, routes, database and safety decisions
scripts/          Development helpers (future)
```

## Getting started

Requirements: **Node.js 22.13+**, npm, Android device/emulator (or Expo Go for the initial UI only).

```bash
npm install
npm run mobile
```

When Expo starts, press `a` for Android emulator (or scan the QR code with Expo Go to preview the initial navigation).

```bash
npm run typecheck
npm test
```

The first successful `npm install` will generate **package-lock.json**. Commit this lockfile with the project to make installs repeatable. Run `npx expo install --check` from `apps/mobile` after installing dependencies; use its recommendations if Expo patch versions have changed.

### Backend

The implemented handler is `apps/api/src/handlers/health/get-health.ts` for a future `GET /v1/health`. Lambda is not deployed yet. More endpoints will be added according to `docs/api-map.md`.

## Public repository checklist

- Never commit `.env`, AWS keys, Cognito secrets, tokens, GPS logs or production user data.
- Only `.env.example` files are safe templates.
- CDK is **not deployed** by this scaffold. Do not paste credentials into source code.
- Change the example Android application ID before the first public release.
- Do not claim heat-exposure scores are medical diagnoses; the calculation model still needs to be finalized and tested.

## How we will build

1. **Scaffold** (this commit)
2. Mobile Home and weather API
3. Amazon Location routes and place search
4. Heat engine + reproducible tests
5. Cognito and rider shift lifecycle
6. Background sample sync + privacy controls
7. Trip history, safety events and final Android build

See `docs/architecture.md` and `docs/decisions.md` for scope.
