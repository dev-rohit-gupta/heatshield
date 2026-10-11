import { compareRouteOutdoorTime } from '@heatshield/heat-engine';
import type { Coordinates, CurrentWeatherData, RouteOption, RoutePlanData, RouteTimeExposure } from '@heatshield/shared';
import { getCurrentWeather, WeatherProviderError } from './weather.service';
import type { RouteExposureAnalyzer } from './route-screening.port';

type WeatherLoader = (location: Coordinates) => Promise<CurrentWeatherData>;
type Analysis = Pick<RoutePlanData, 'routes' | 'recommendedRouteId' | 'analysisStatus' | 'notice'>;

const unsupported = (routes: RouteOption[], notice: string, status: Analysis['analysisStatus']): Analysis => ({
  routes, recommendedRouteId: null, analysisStatus: status, notice,
});

/** Combines independent weather and duration inputs. Gracefully degrades if data is missing. */
export class WeatherRouteExposureAnalyzer implements RouteExposureAnalyzer {
  constructor(
    private readonly getWeather: WeatherLoader = getCurrentWeather,
    private readonly now: () => number = Date.now,
  ) {}

  async analyze(routes: RouteOption[], origin: Coordinates, departureAt?: string): Promise<Analysis> {
    // Current observations are not a departure-time forecast; never pretend otherwise.
    if (departureAt && Math.abs(Date.parse(departureAt) - this.now()) > 15 * 60_000) {
      return unsupported(routes, 'Later departures require forecast data. No current-weather comparison is shown.', 'OUT_OF_SCOPE');
    }
    if (routes.some((route) => !Number.isInteger(route.durationSeconds) || route.durationSeconds <= 0 || route.durationSeconds > 3600)) {
      return unsupported(routes, 'This journey is outside the 60-minute constant-weather screening range.', 'OUT_OF_SCOPE');
    }
    let weather: CurrentWeatherData;
    try { weather = await this.getWeather(origin); }
    catch (cause) {
      if (cause instanceof WeatherProviderError) return unsupported(routes, 'Weather unavailable. Routes are shown by travel time only.', 'WEATHER_UNAVAILABLE');
      throw cause;
    }
    const ageMs = this.now() - Date.parse(weather.validAt);
    if (!Number.isFinite(ageMs) || ageMs < -5 * 60_000 || ageMs > 90 * 60_000) {
      return unsupported(routes, 'Weather estimate is outdated. No heat screening is shown.', 'WEATHER_UNAVAILABLE');
    }
    const comparison = compareRouteOutdoorTime(routes, {
      temperatureC: weather.weather.temperatureC,
      relativeHumidityPct: weather.weather.relativeHumidityPct,
    });
    const mapped = new Map(comparison.routes.map(route => [route.routeId, route]));
    const source: RouteTimeExposure['weatherSource'] = weather.source.kind === 'DEMO_SAMPLE' ? 'DEMO_SAMPLE' : 'LIVE_MODEL';
    const screened: RouteOption[] = routes.map((route) => {
      const result = mapped.get(route.routeId)!;
      return { ...route, exposure: {
        method: 'CONSTANT_AREA_HEAT_INDEX', estimatedOutdoorSeconds: result.estimatedOutdoorSeconds,
        heatIndexC: result.heatIndexC, band: result.band,
        weatherValidAt: weather.validAt, weatherSource: source,
      } };
    });
    return {
      routes: screened,
      recommendedRouteId: comparison.recommendedRouteId,
      analysisStatus: 'SCREENED',
      notice: comparison.recommendedRouteId
        ? `Shortest route means about ${comparison.minutesSaved} fewer outdoor minutes than the longest option under the SAME area weather. Not a street-shade or personal safety prediction.`
        : 'No meaningful reduction in outdoor time was established. The same area heat index applies to all routes; street shade is unknown.',
    };
  }
}
