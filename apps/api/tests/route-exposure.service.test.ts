import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { CurrentWeatherData, RouteOption } from '@heatshield/shared';
import { WeatherRouteExposureAnalyzer } from '../src/services/route-exposure.service';
import { WeatherProviderError } from '../src/services/weather.service';

const origin = { lat: 18.5204, lng: 73.8567 };
const routes: RouteOption[] = [
  { routeId: 'fast', type: 'FASTEST', distanceMeters: 5000, durationSeconds: 800, geometry: { type: 'LineString', coordinates: [[73.85, 18.52], [73.91, 18.56]] }, exposure: null },
  { routeId: 'slow', type: 'ALTERNATIVE', distanceMeters: 5500, durationSeconds: 1250, geometry: { type: 'LineString', coordinates: [[73.85, 18.52], [73.91, 18.56]] }, exposure: null },
];
const now = Date.parse('2026-10-11T12:00:00.000Z');
const weather = (overrides: Partial<CurrentWeatherData> = {}): CurrentWeatherData => ({
  location: origin, validAt: new Date(now).toISOString(),
  source: { provider: 'Open-Meteo', kind: 'MODEL_ESTIMATE' },
  weather: { temperatureC: 35, relativeHumidityPct: 70, apparentTemperatureC: 42, windSpeedKph: 5, uvIndex: 8, solarRadiationWm2: 700, isDay: true },
  ...overrides,
});

test('current weather gives equal bands and only shorter time is preferred', async () => {
  const service = new WeatherRouteExposureAnalyzer(async () => weather(), () => now);
  const result = await service.analyze(routes, origin);
  assert.equal(result.analysisStatus, 'SCREENED');
  assert.equal(result.recommendedRouteId, 'fast');
  assert.equal(result.routes[0].exposure?.band, result.routes[1].exposure?.band);
  assert.equal(result.routes[0].exposure?.estimatedOutdoorSeconds, 800);
  assert.match(result.notice, /SAME area weather/);
});

test('weather provider outage leaves route available with no exposure rating', async () => {
  const service = new WeatherRouteExposureAnalyzer(async () => { throw new WeatherProviderError(); }, () => now);
  const result = await service.analyze(routes, origin);
  assert.equal(result.analysisStatus, 'WEATHER_UNAVAILABLE');
  assert.equal(result.recommendedRouteId, null);
  assert.ok(result.routes.every(r => r.exposure === null));
});

test('old model estimate and future requested departure are not silently scored', async () => {
  const service = new WeatherRouteExposureAnalyzer(async () => weather({ validAt: new Date(now-3*3600_000).toISOString() }), () => now);
  assert.equal((await service.analyze(routes, origin)).analysisStatus, 'WEATHER_UNAVAILABLE');
  assert.equal((await service.analyze(routes, origin, new Date(now+2*3600_000).toISOString())).analysisStatus, 'OUT_OF_SCOPE');
});

test('one-hour model rejects longer routes rather than simulating constant conditions', async () => {
  const service = new WeatherRouteExposureAnalyzer(async () => weather(), () => now);
  const result = await service.analyze([...routes, { ...routes[0], routeId: 'very-long', durationSeconds: 4000 }], origin);
  assert.equal(result.analysisStatus, 'OUT_OF_SCOPE');
  assert.equal(result.recommendedRouteId, null);
});
