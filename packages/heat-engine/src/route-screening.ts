import { screenHeatIndex, type HeatIndexBand } from './heat-index';

/** A route may only be screened as time outdoors under the SAME area weather. */
export type RouteDuration = { routeId: string; durationSeconds: number };
export type RouteTimeScreening = {
  routeId: string;
  estimatedOutdoorSeconds: number;
  heatIndexC: number;
  band: HeatIndexBand;
};
export type RouteTimeComparison = {
  routes: RouteTimeScreening[];
  recommendedRouteId: string | null;
  reasonCode: 'LESS_TIME_OUTDOORS' | 'NO_MEANINGFUL_DIFFERENCE';
  minutesSaved: number;
};

const MAX_DURATION_SECONDS = 3600;
const MIN_SAVING_SECONDS = 180;
const MIN_FRACTIONAL_SAVING = 0.1;

/**
 * A simple, honest screening estimate: predicted trip duration = outdoor time.
 * It does not infer street temperature, tree cover, sun/shade or individual risk.
 * V1 is deliberately restricted to trips up to 60 minutes; longer journeys need
 * a time-varying forecast and more detailed route context.
 */
export function compareRouteOutdoorTime(
  routes: readonly RouteDuration[],
  conditions: { temperatureC: number; relativeHumidityPct: number },
): RouteTimeComparison {
  if (!routes.length || routes.length > 3) throw new RangeError('Expected 1 to 3 routes.');
  if (new Set(routes.map((route) => route.routeId)).size !== routes.length) {
    throw new RangeError('Route IDs must be unique.');
  }
  for (const route of routes) {
    if (!route.routeId || !Number.isInteger(route.durationSeconds) || route.durationSeconds <= 0 || route.durationSeconds > MAX_DURATION_SECONDS) {
      throw new RangeError('Only route durations of 1 to 3600 seconds are supported.');
    }
  }
  const index = screenHeatIndex(conditions.temperatureC, conditions.relativeHumidityPct);
  const sorted = [...routes].sort((a, b) => a.durationSeconds - b.durationSeconds || a.routeId.localeCompare(b.routeId));
  const best = sorted[0];
  const longest = sorted.at(-1)!;
  const difference = longest.durationSeconds - best.durationSeconds;
  const meaningful = routes.length > 1 && difference >= MIN_SAVING_SECONDS && difference / longest.durationSeconds >= MIN_FRACTIONAL_SAVING;
  return {
    routes: routes.map((route) => ({
      routeId: route.routeId,
      estimatedOutdoorSeconds: route.durationSeconds,
      heatIndexC: index.heatIndexC,
      band: index.band,
    })),
    recommendedRouteId: meaningful ? best.routeId : null,
    reasonCode: meaningful ? 'LESS_TIME_OUTDOORS' : 'NO_MEANINGFUL_DIFFERENCE',
    minutesSaved: meaningful ? Math.round(difference / 60) : 0,
  };
}
