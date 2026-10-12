import * as Location from 'expo-location';
import type { WeatherEvidence } from '@heatshield/heat-engine';
import { fetchCurrentWeather } from '@/services/weather-api';

/** An adapter: domain code never imports Expo, Open-Meteo, or the HTTP client. */
export interface ShiftWeatherSource {
  fetch(): Promise<WeatherEvidence>;
}

export class ForegroundWeatherSource implements ShiftWeatherSource {
  async fetch(): Promise<WeatherEvidence> {
    const permission = await Location.requestForegroundPermissionsAsync();
    if (!permission.granted) throw new Error('Allow location to get local weather, or continue with unassessed time.');
    const fix = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    const result = await fetchCurrentWeather({ lat: fix.coords.latitude, lng: fix.coords.longitude });
    return {
      temperatureC: result.weather.temperatureC,
      relativeHumidityPct: result.weather.relativeHumidityPct,
      validAt: result.validAt,
      fetchedAt: new Date().toISOString(),
      source: result.source.kind,
    };
  }
}
