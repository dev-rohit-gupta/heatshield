import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { getCurrentWeather, WeatherProviderError } from '../src/services/weather.service';

const location = { lat: 18.5204, lng: 73.8567 };

function reply(data: unknown): typeof fetch {
  return (async () => Response.json(data)) as typeof fetch;
}

test('Open-Meteo result is normalized and missing UV stays null', async () => {
  const fetchStub: typeof fetch = async (input) => {
    const url = new URL(String(input));
    assert.equal(url.searchParams.get('latitude'), '18.520');
    assert.equal(url.searchParams.get('longitude'), '73.857');
    assert.match(url.searchParams.get('current') || '', /uv_index/);
    return Response.json({ current: {
      time: '2026-10-11T12:00',
      temperature_2m: 32.3,
      apparent_temperature: 38.2,
      relative_humidity_2m: 57,
      wind_speed_10m: 13,
      uv_index: null,
      shortwave_radiation: 600,
      is_day: 1,
    } });
  };

  const data = await getCurrentWeather(location, fetchStub);
  assert.equal(data.validAt, '2026-10-11T12:00:00.000Z');
  assert.equal(data.weather.uvIndex, null);
  assert.equal(data.weather.temperatureC, 32.3);
  assert.equal(data.weather.isDay, true);
  assert.deepEqual(data.location, location);
});

test('malformed provider data is rejected without invented measurements', async () => {
  await assert.rejects(
    getCurrentWeather(location, reply({ current: { temperature_2m: null } })),
    WeatherProviderError,
  );
});

test('an HTTP upstream failure is sanitized', async () => {
  const fail: typeof fetch = (async () => new Response('private provider error', { status: 503 })) as typeof fetch;
  await assert.rejects(getCurrentWeather(location, fail), WeatherProviderError);
});
