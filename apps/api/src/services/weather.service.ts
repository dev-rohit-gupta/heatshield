import type { Coordinates, CurrentWeatherData } from '@heatshield/shared';

const WEATHER_URL = 'https://api.open-meteo.com/v1/forecast';
const CURRENT_FIELDS = [
  'temperature_2m',
  'relative_humidity_2m',
  'apparent_temperature',
  'wind_speed_10m',
  'uv_index',
  'shortwave_radiation',
  'is_day',
].join(',');

export class WeatherProviderError extends Error {
  constructor() {
    super('Weather information is temporarily unavailable. Please try again.');
    this.name = 'WeatherProviderError';
  }
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function optionalNumber(value: unknown): number | null {
  return isFiniteNumber(value) ? value : null;
}

function validTime(value: unknown): string | null {
  // Open-Meteo returns a UTC wall time without a timezone suffix when timezone=GMT.
  if (typeof value !== 'string' || !/^\d{4}-\d\d-\d\dT\d\d:\d\d(?:\:\d\d)?$/.test(value)) {
    return null;
  }
  const utc = new Date(`${value}Z`);
  return Number.isFinite(utc.getTime()) ? utc.toISOString() : null;
}

/** Fetch model-based current conditions; never derive a medical/safety score here. */
export async function getCurrentWeather(
  location: Coordinates,
  fetchImpl: typeof fetch = fetch,
): Promise<CurrentWeatherData> {
  const url = new URL(WEATHER_URL);
  // Avoid sending unnecessarily precise GPS coordinates to the provider.
  url.searchParams.set('latitude', location.lat.toFixed(3));
  url.searchParams.set('longitude', location.lng.toFixed(3));
  url.searchParams.set('current', CURRENT_FIELDS);
  url.searchParams.set('timezone', 'GMT');
  url.searchParams.set('forecast_days', '1');
  url.searchParams.set('temperature_unit', 'celsius');
  url.searchParams.set('wind_speed_unit', 'kmh');

  try {
    const response = await fetchImpl(url, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) throw new WeatherProviderError();

    const payload: unknown = await response.json();
    if (typeof payload !== 'object' || payload === null || !('current' in payload)) {
      throw new WeatherProviderError();
    }
    const current = payload.current;
    if (typeof current !== 'object' || current === null) throw new WeatherProviderError();

    const data = current as Record<string, unknown>;
    const temperature = data.temperature_2m;
    const humidity = data.relative_humidity_2m;
    const apparentTemperature = data.apparent_temperature;
    const time = validTime(data.time);

    if (
      !isFiniteNumber(temperature) ||
      !isFiniteNumber(humidity) || humidity < 0 || humidity > 100 ||
      !isFiniteNumber(apparentTemperature) ||
      time === null
    ) {
      throw new WeatherProviderError();
    }

    return {
      location,
      validAt: time,
      source: { provider: 'Open-Meteo', kind: 'MODEL_ESTIMATE' },
      weather: {
        temperatureC: temperature,
        apparentTemperatureC: apparentTemperature,
        relativeHumidityPct: humidity,
        windSpeedKph: optionalNumber(data.wind_speed_10m),
        uvIndex: optionalNumber(data.uv_index),
        solarRadiationWm2: optionalNumber(data.shortwave_radiation),
        isDay: data.is_day === 1 ? true : data.is_day === 0 ? false : null,
      },
    };
  } catch {
    // Never expose provider/network errors, keys, or internal URLs to the client.
    throw new WeatherProviderError();
  }
}
