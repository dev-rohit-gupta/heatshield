import type { Coordinates, ScreenedWeatherData } from '@heatshield/shared';
import { ApiClientError, apiRequest } from './api-client';

// Keep the original exported error name for any existing callers.
export { ApiClientError as WeatherApiError };

/** Weather and Location features share the same HTTP transport/error handling. */
export function fetchCurrentWeather(coords: Coordinates): Promise<ScreenedWeatherData> {
  const params = new URLSearchParams({ lat: String(coords.lat), lng: String(coords.lng) });
  return apiRequest<ScreenedWeatherData>(`/weather/current?${params}`);
}
