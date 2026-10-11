import type { ApiSuccess, Coordinates, CurrentWeatherData } from '@heatshield/shared';

export class WeatherApiError extends Error {}

/** Mobile calls our backend only, never Open-Meteo directly. */
export async function fetchCurrentWeather(coords: Coordinates): Promise<CurrentWeatherData> {
  const base = process.env.EXPO_PUBLIC_API_BASE_URL?.replace(/\/$/, '');
  if (!base) {
    throw new WeatherApiError('Set EXPO_PUBLIC_API_BASE_URL in apps/mobile/.env and restart Expo.');
  }

  const url = `${base}/weather/current?lat=${encodeURIComponent(coords.lat)}&lng=${encodeURIComponent(coords.lng)}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12_000);
  try {
    const response = await fetch(url, { signal: controller.signal });
    const json: unknown = await response.json();
    if (!response.ok || typeof json !== 'object' || json === null || !('success' in json) || json.success !== true) {
      const message = (typeof json === 'object' && json !== null && 'error' in json &&
        typeof json.error === 'object' && json.error !== null && 'message' in json.error &&
        typeof json.error.message === 'string')
        ? json.error.message : 'Weather request failed. Please retry.';
      throw new WeatherApiError(message);
    }
    return (json as ApiSuccess<CurrentWeatherData>).data;
  } catch (error) {
    if (error instanceof WeatherApiError) throw error;
    if (controller.signal.aborted) throw new WeatherApiError('Weather request timed out. Please retry.');
    throw new WeatherApiError('Cannot connect to HeatShield API. Check the server and network.');
  } finally {
    clearTimeout(timer);
  }
}
