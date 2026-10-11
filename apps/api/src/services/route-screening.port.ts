import type { Coordinates, RoutePlanData, RouteOption } from '@heatshield/shared';

/** Domain port: routing does not know Open-Meteo or the heat-index implementation. */
export interface RouteExposureAnalyzer {
  analyze(routes: RouteOption[], origin: Coordinates, departureAt?: string): Promise<Pick<RoutePlanData, 'routes' | 'recommendedRouteId' | 'analysisStatus' | 'notice'>>;
}
