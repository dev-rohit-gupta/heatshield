import type { Coordinates, CurrentWeatherData } from '@heatshield/shared';

/** Explicitly fictional data for OFFLINE development; never exported by production Lambdas. */
export async function getDemoWeather(location: Coordinates): Promise<CurrentWeatherData> {
  return {
    location,
    validAt: new Date().toISOString(),
    source: { provider: 'HeatShield Demo', kind: 'DEMO_SAMPLE' },
    weather: {
      temperatureC: 35, apparentTemperatureC: 42, relativeHumidityPct: 70,
      windSpeedKph: 10, uvIndex: 7, solarRadiationWm2: 600, isDay: true,
    },
  };
}
