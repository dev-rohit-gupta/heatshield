# Proposed API map (design, not implemented)

All routes use `/v1`. Cognito is used for protected requests. Every response uses the common `{success, data|error, meta}` envelope.

## Public
- `GET /health`
- `GET /weather/current`
- `GET /places/search`
- `POST /routes/plan`

## Rider account
- `GET /me`
- `PATCH /me`

## Shifts
- `POST /shifts`
- `GET /shifts/active`
- `POST /shifts/{shiftId}/context` (needed for outdoors/indoors and working/resting)
- `POST /shifts/{shiftId}/end`

## Trips
- `POST /trips`
- `GET /trips/active`
- `GET /trips`
- `GET /trips/{tripId}`
- `POST /trips/{tripId}/complete`
- `POST /trips/{tripId}/cancel`

## Exposure and safety
- `POST /exposure/sync`
- `GET /exposure/today`
- `GET /exposure/history`
- `GET /safety-events`
- `POST /safety-events/{eventId}/acknowledge`

**21 planned routes total; only `GET /v1/health` has code in the starter.**

## Expected application-level safety rules
- Never accept rider IDs from the client as an authorization claim.
- Compute exposure and risk bands on the server.
- Use bounded input validation, rate limiting and idempotency on retryable writes.
- Do not persist raw GPS points indefinitely.
- Require explicit consent for background GPS tracking.
