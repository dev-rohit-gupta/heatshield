import type { Coordinates, RoutePlanData, SearchPlacesData } from '@heatshield/shared';
import type { LocationProvider } from './location.port';
import type { RouteExposureAnalyzer } from './route-screening.port';

/** Workflow orchestrator: depends on provider and optional screening abstractions. */
export class LocationService {
  constructor(
    private readonly provider: LocationProvider,
    private readonly analyzer?: RouteExposureAnalyzer,
  ) {}

  async search(query: string, near: Coordinates | undefined, limit: number): Promise<SearchPlacesData> {
    return { places: await this.provider.searchPlaces(query, near, limit) };
  }

  async plan(origin: Coordinates, destination: Coordinates, departureAt?: string): Promise<RoutePlanData> {
    const routes = await this.provider.calculateRoutes(origin, destination, departureAt);
    const analysis = this.analyzer
      ? await this.analyzer.analyze(routes, origin, departureAt)
      : { routes, recommendedRouteId: null, analysisStatus: 'ROUTES_ONLY' as const, notice: 'Weather screening not configured. Routes are sorted by travel time.' };
    return {
      origin, destination, travelMode: 'SCOOTER',
      routeSource: this.provider.source === 'DEMO' ? 'DEMO' : 'AWS',
      ...analysis,
      notice: (this.provider.source === 'DEMO' ? 'DEMO ONLY - route geometry is illustrative, not verified roads and not for navigation. ' : '') + analysis.notice,
    };
  }
}
