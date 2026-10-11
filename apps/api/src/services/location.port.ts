import type { Coordinates, PlaceResult, RouteOption } from '@heatshield/shared';

/** Domain-facing port; no AWS SDK objects escape this boundary. */
export interface LocationProvider {
  searchPlaces(query: string, near: Coordinates | undefined, limit: number): Promise<PlaceResult[]>;
  calculateRoutes(origin: Coordinates, destination: Coordinates, departureAt?: string): Promise<RouteOption[]>;
}

export class LocationProviderError extends Error {}
export class RouteUnavailableError extends Error {}
