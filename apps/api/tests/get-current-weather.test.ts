import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { handleCurrentWeather } from '../src/handlers/weather/get-current-weather';
import type { CurrentWeatherData } from '@heatshield/shared';

const sample: CurrentWeatherData = {
  location: { lat: 18.52, lng: 73.85 },
  validAt: '2026-10-11T12:00:00.000Z',
  source: { provider: 'Open-Meteo', kind: 'MODEL_ESTIMATE' },
  weather: {
    temperatureC: 32,
    apparentTemperatureC: 35,
    relativeHumidityPct: 60,
    windSpeedKph: 8,
    uvIndex: 4,
    solarRadiationWm2: 400,
    isDay: true,
  },
};

test('current weather returns the standard success envelope', async () => {
  const result = await handleCurrentWeather({ lat: '18.52', lng: '73.85' }, 'req-1', async () => sample);
  assert.equal(result.statusCode, 200);
  const body = JSON.parse(result.body);
  assert.equal(body.success, true);
  assert.equal(body.data.weather.temperatureC, 32);
  assert.equal(body.data.source.kind, 'MODEL_ESTIMATE');
  assert.equal(body.data.heatScreening.modelVersion, 'nws-heat-index-v1');
  assert.ok(Number.isFinite(body.data.heatScreening.heatIndexC));
  assert.equal(body.meta.requestId, 'req-1');
});

test('current weather rejects missing, invalid and out-of-range coordinates', async () => {
  for (const query of [undefined, { lat: '', lng: '73' }, { lat: '91', lng: '73' }, { lat: '0', lng: '181' }, { lat: 'oops', lng: '0' }]) {
    const result = await handleCurrentWeather(query, 'req-2', async () => sample);
    assert.equal(result.statusCode, 400);
    assert.equal(JSON.parse(result.body).error.code, 'INVALID_COORDINATES');
  }
});

test('provider failure is translated into a retryable 502', async () => {
  const result = await handleCurrentWeather({ lat: '18.52', lng: '73.85' }, 'req-3', async () => {
    throw new Error('provider secret internal details');
  });
  assert.equal(result.statusCode, 502);
  const body = JSON.parse(result.body);
  assert.equal(body.error.code, 'WEATHER_PROVIDER_ERROR');
  assert.equal(body.error.retryable, true);
  assert.doesNotMatch(result.body, /provider secret internal details/);
});
