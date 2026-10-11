import type { Coordinates, PlaceResult, RouteOption } from '@heatshield/shared';
import type { LocationProvider } from '../services/location.port';
import { RouteUnavailableError } from '../services/location.port';

// Hand-authored illustrations only. These polylines are NOT verified roads.
const PUNE: Coordinates = { lat: 18.5204, lng: 73.8567 };
const PLACES: PlaceResult[] = [
  { placeId: 'demo-viman-nagar', name: 'Viman Nagar (Demo)', address: 'Illustrative destination, Pune', location: { lat: 18.5679, lng: 73.9143 } },
  { placeId: 'demo-koregaon-park', name: 'Koregaon Park (Demo)', address: 'Illustrative destination, Pune', location: { lat: 18.5363, lng: 73.8938 } },
];
const near = (a: Coordinates, b: Coordinates) => Math.abs(a.lat - b.lat) < 0.001 && Math.abs(a.lng - b.lng) < 0.001;
const makeRoute = (id: string, type: RouteOption['type'], seconds: number, meters: number, points: [number,number][]): RouteOption => ({
  routeId: id, type, durationSeconds: seconds, distanceMeters: meters,
  geometry: { type: 'LineString', coordinates: points }, exposure: null,
});

/** Works with no AWS account. Only predetermined Pune demo locations are supported. */
export class DemoLocationProvider implements LocationProvider {
  readonly source = 'DEMO' as const;

  async searchPlaces(query: string, nearOrigin: Coordinates | undefined, limit: number): Promise<PlaceResult[]> {
    if (nearOrigin && (Math.abs(nearOrigin.lat - PUNE.lat) > 0.15 || Math.abs(nearOrigin.lng - PUNE.lng) > 0.15)) return [];
    const term = query.toLowerCase();
    return PLACES.filter(p => `${p.name} ${p.address}`.toLowerCase().includes(term)).slice(0, limit);
  }

  async calculateRoutes(origin: Coordinates, destination: Coordinates): Promise<RouteOption[]> {
    if (!near(origin, PUNE)) {
      throw new RouteUnavailableError('Demo supports only the Pune test origin. Choose Try Pune or enable AWS for live routes.');
    }
    const vn = PLACES[0].location;
    const kp = PLACES[1].location;
    if (near(destination, vn)) return [
      makeRoute('demo_fast', 'FASTEST', 1080, 6200, [[PUNE.lng,PUNE.lat], [73.873,18.532], [73.889,18.546], [vn.lng,vn.lat]]),
      makeRoute('demo_alt', 'ALTERNATIVE', 1420, 7100, [[PUNE.lng,PUNE.lat], [73.863,18.538], [73.879,18.558], [vn.lng,vn.lat]]),
    ];
    if (near(destination, kp)) return [
      makeRoute('demo_fast', 'FASTEST', 780, 3900, [[PUNE.lng,PUNE.lat], [73.868,18.524], [kp.lng,kp.lat]]),
      makeRoute('demo_alt', 'ALTERNATIVE', 840, 4100, [[PUNE.lng,PUNE.lat], [73.859,18.533], [kp.lng,kp.lat]]),
    ];
    throw new RouteUnavailableError('Demo supports only Viman Nagar and Koregaon Park. Other routes need AWS access.');
  }
}
