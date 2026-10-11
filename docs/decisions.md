# Agreed scope

- **Primary user:** delivery rider, not fleet manager.
- **Mobile:** Expo / React Native / TypeScript, Android-first.
- **Backend:** API Gateway + Lambda / TypeScript, **not Express**.
- **Database:** DynamoDB; physical key/index design still pending.
- **External data:** Amazon Location Service and Open-Meteo.
- **Auth:** Cognito for personal history, shift and trip APIs.
- **Shared engine:** deterministic exposure estimate, not a diagnosis.
- **Main journey:** home -> start shift -> route -> active trip -> exposure -> alert -> end shift.
- **Privacy:** no unbounded GPS retention; explicit background permission and user controls.
- **Not V1:** fleet dashboard, hardware, turn-by-turn voice navigation, AI-based medical advice.

## Before real exposure tracking

We must specify the formula and weather-data granularity; outdoors/indoors handling; time gaps; local queue and idempotent upload; Android background tracking restrictions; and the meaning of each risk band. Do not manufacture precise exposure reductions from coarse forecasts.
