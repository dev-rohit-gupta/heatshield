import type { Coordinates, RoutePlanData, SearchPlacesData } from '@heatshield/shared';
import { apiRequest } from './api-client';

export function searchPlaces(q: string, near?: Coordinates, signal?: AbortSignal): Promise<SearchPlacesData> {
  const params = new URLSearchParams({ q, limit: '5' });
  if (near) { params.set('lat', String(near.lat)); params.set('lng', String(near.lng)); }
  return apiRequest<SearchPlacesData>(`/places/search?${params}`, { signal });
}

export function planScooterRoute(origin: Coordinates, destination: Coordinates, signal?: AbortSignal): Promise<RoutePlanData> {
  return apiRequest<RoutePlanData>('/routes/plan', {
    method: 'POST', body: { origin, destination, travelMode: 'SCOOTER' }, signal,
  });
}
