# HeatShield Step 5 - Route comparison without AWS

## What it does

1. Search one of two **illustrative Pune destinations** with `LOCATION_PROVIDER=demo`.
2. Display two hand-authored sample polylines. They are **not verified roads or navigable directions**.
3. For trips of 60 minutes or less starting near the current time, use Open-Meteo's area model weather to estimate how many minutes each ride spends in the **same** NWS heat-index band.
4. A label highlights shorter outdoor time **only if the time saving is at least 3 minutes AND at least 10% of the longest route**.
5. No individual medical risk, street-level shade benefit, route-specific temperature, or dose reduction percentage is claimed.

## Software design

`LocationProvider` (AWS or Demo) -> `LocationService` <- `RouteExposureAnalyzer` <- `WeatherLoader` + pure `compareRouteOutdoorTime`

The Expo UI only reads shared response contracts. The domain engine has no AWS, Expo or HTTP imports.

## Run without AWS credentials

In Git Bash, from repository root:

```bash
export LOCATION_PROVIDER=demo
export DEMO_WEATHER=1
pnpm --filter @heatshield/api exec tsx watch src/dev/server.ts
```

`DEMO_WEATHER=1` uses deliberately **fictional** 35 C / 70% humidity values to allow an offline demonstration. To use real Open-Meteo model data, run `unset DEMO_WEATHER` and restart the local API. Demo weather is labeled in the response and UI.

In a second terminal:

```bash
pnpm mobile
```

Open Routes -> Try Pune -> search **Viman** -> select **Viman Nagar (Demo)**. The API base URL configured in Step 2 must still point to your local backend.

## Curl

```bash
curl 'http://localhost:3001/v1/places/search?q=Viman&lat=18.5204&lng=73.8567'
curl -X POST 'http://localhost:3001/v1/routes/plan' -H 'Content-Type: application/json' -d '{"origin":{"lat":18.5204,"lng":73.8567},"destination":{"lat":18.5679,"lng":73.9143},"travelMode":"SCOOTER"}'
```

## Deliberate limitations

- Only the **local dev server** wires in the demo provider; Lambda routes always use AWS.
- The demo shows hand-authored shapes, not roads. Never follow these paths while driving.
- Same forecast grid often means both real routes have the same heat-index band.
- For future departures >15 minutes away, routes >60 minutes, stale/missing weather, no comparison or recommendation is shown.
- This is a weather-based **screening estimate**, not a clinical or occupational clearance to work.
- Route comparison does not persist searches or GPS data.

## Verification

```bash
pnpm --filter @heatshield/heat-engine test
pnpm --filter @heatshield/api test
pnpm check
pnpm --filter @heatshield/mobile exec expo install --check
```

The Step 5 patch only replaces listed files and adds new files. Do **not** copy the old base workspace or its package.json/lockfile: keep your locally validated pnpm and Expo versions.
