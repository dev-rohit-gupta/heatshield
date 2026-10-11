# HeatShield Step 4: Heat index screening (V1)

## What this feature does

Open-Meteo current temperature + humidity -> **pure NWS heat-index calculation** ->
NWS screening band -> simple text on Expo Home.

- This is a **weather-based screening estimate** for shade.
- It is **not a medical risk score**, heat-stroke probability, WBGT or a safety clearance.
- Direct sun, workload, clothing, acclimatization, health, street-level heat and indoor
  conditions are NOT represented.
- Different nearby routes can share the same forecast. Do **not** claim route A is safer
  than route B until meaningful comparative evidence is available.
- We deliberately have **no invented 0-100 risk score** in Step 4.

## Formula

Implements the US National Weather Service simple approximation below the warm-condition
threshold and Rothfusz regression when the preliminary heat index is >= 80 F.
Includes dry/humid adjustments. Reference:
https://www.wpc.ncep.noaa.gov/html/heatindex_equation.shtml

OSHA notes that heat index alone is insufficient to assess worker heat stress:
https://www.osha.gov/heat-exposure/hazards

## Pure functions

- `calculateHeatIndexC(tempC, relativeHumidityPct)`
- `classifyHeatIndexC(heatIndexC)`
- `screenHeatIndex(tempC, relativeHumidityPct)`
- `evaluateExposureSegment({ environment, durationSeconds, ...weather })`
- `summarizeExposure(segments)`

The last two functions **do not infer indoor conditions from outdoor forecasts**. If a rider's
location/environment or a needed weather input is unknown, mark the interval unassessed.

## Integration boundary

Weather provider (`apps/api/src/services/weather.service.ts`) is untouched.
The weather Lambda attaches `heatScreening`, and Expo shows the derived screening band.
No AWS credentials are required for this feature.

## Later work

1. Validate a separate worker-appropriate model, ideally incorporating a WBGT-based
   approach and calibrated environmental inputs.
2. Time-match route segments to forecast hours before computing exposure comparisons.
3. Add tracked outdoor segments, idempotent sync, and real route data.
4. Permit test route providers only with clear demo labels; never navigate on fake geometry.
