import type { Coordinates, RouteOption } from '@heatshield/shared';

/** GeoJSON uses longitude, latitude. HeatShield's domain model uses {lat,lng}. */
export type LngLat = [number, number];
export type RouteLineFeature = {
  type: 'Feature';
  properties: { routeId: string };
  geometry: { type: 'LineString'; coordinates: LngLat[] };
};
export type RouteLineCollection = {
  type: 'FeatureCollection';
  features: RouteLineFeature[];
};

export const EMPTY_ROUTE_COLLECTION: RouteLineCollection = {
  type: 'FeatureCollection',
  features: [],
};

function isValidLngLat(value: unknown): value is LngLat {
  return Array.isArray(value)
    && value.length === 2
    && typeof value[0] === 'number'
    && typeof value[1] === 'number'
    && Number.isFinite(value[0])
    && Number.isFinite(value[1])
    && value[0] >= -180 && value[0] <= 180
    && value[1] >= -90 && value[1] <= 90;
}

function routeCoordinates(route: RouteOption): LngLat[] {
  if (route.geometry.type !== 'LineString') return [];
  const coords = route.geometry.coordinates;
  // Reject the entire line if the upstream provider returns corrupt geometry.
  if (!Array.isArray(coords) || coords.length < 2 || !coords.every(isValidLngLat)) return [];
  return coords;
}

/** Build separately styled map overlays without coupling route data to MapLibre. */
export function splitRouteCollections(routes: RouteOption[], selectedRouteId: string | null) {
  const selected: RouteLineCollection = { type: 'FeatureCollection', features: [] };
  const alternatives: RouteLineCollection = { type: 'FeatureCollection', features: [] };
  for (const route of routes) {
    const coordinates = routeCoordinates(route);
    if (coordinates.length < 2) continue;
    const feature: RouteLineFeature = {
      type: 'Feature',
      properties: { routeId: route.routeId },
      geometry: { type: 'LineString', coordinates },
    };
    (route.routeId === selectedRouteId ? selected : alternatives).features.push(feature);
  }
  return { selected, alternatives };
}

/** [west, south, east, north], for the MapLibre v11 camera. */
export function computeRouteBounds(
  origin: Coordinates,
  destination: Coordinates,
  routes: RouteOption[],
): [number, number, number, number] {
  const points: LngLat[] = [
    [origin.lng, origin.lat],
    [destination.lng, destination.lat],
    ...routes.flatMap(routeCoordinates),
  ].filter(isValidLngLat);
  if (!points.length) throw new Error('Route bounds require valid coordinates');

  const lngs = points.map(point => point[0]);
  const lats = points.map(point => point[1]);
  const west = Math.min(...lngs);
  const east = Math.max(...lngs);
  const south = Math.min(...lats);
  const north = Math.max(...lats);
  // Ensure even a zero-length test trip has a visible viewport.
  const lngPad = Math.max((east - west) * 0.12, 0.002);
  const latPad = Math.max((north - south) * 0.12, 0.002);
  return [west - lngPad, south - latPad, east + lngPad, north + latPad];
}

/** Map style can be changed without modifying the UI. Public default: OpenFreeMap. */
export const DEFAULT_MAP_STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty';
export function selectMapStyleUrl(configuredUrl: string | undefined): string {
  const url = configuredUrl?.trim();
  return url && /^https:\/\/\S+$/i.test(url) ? url : DEFAULT_MAP_STYLE_URL;
}
