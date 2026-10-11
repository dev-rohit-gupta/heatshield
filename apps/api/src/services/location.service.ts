import type { Coordinates, RoutePlanData, SearchPlacesData } from '@heatshield/shared';
import type { LocationProvider } from './location.port';

/** The same orchestration works with AWS, a test double, or a future provider. */
export class LocationService {
  constructor(private readonly provider: LocationProvider) {}

  async search(query: string, near: Coordinates | undefined, limit: number): Promise<SearchPlacesData> {
    return { places: await this.provider.searchPlaces(query, near, limit) };
  }

  async plan(origin: Coordinates, destination: Coordinates, departureAt?: string): Promise<RoutePlanData> {
    const routes = await this.provider.calculateRoutes(origin, destination, departureAt);
    return {
      origin, destination, travelMode: 'SCOOTER', routes,
      recommendedRouteId: null, analysisStatus: 'ROUTES_ONLY',
      notice: 'Routes are compared by travel time only. Heat exposure scoring is not available yet.',
    };
  }
}
