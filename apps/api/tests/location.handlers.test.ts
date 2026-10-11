import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import type { LocationProvider } from '../src/services/location.port';
import { LocationProviderError, RouteUnavailableError } from '../src/services/location.port';
import { LocationService } from '../src/services/location.service';
import { handleSearchPlaces } from '../src/handlers/places/search-places';
import { handlePlanRoute } from '../src/handlers/routes/plan-route';

const origin = { lat: 18.5204, lng: 73.8567 };
const dest = { lat: 18.56, lng: 73.91 };
const fakeProvider: LocationProvider = {
  async searchPlaces(_query, near, limit) {
    assert.deepEqual(near, origin);
    assert.equal(limit, 5);
    return [{ placeId: 'p-1', name: 'Viman Nagar', address: 'Pune', location: dest }];
  },
  async calculateRoutes() {
    return [{ routeId: 'route_1', type: 'FASTEST', distanceMeters: 6700, durationSeconds: 1100, geometry: { type: 'LineString', coordinates: [[origin.lng, origin.lat], [dest.lng, dest.lat]] }, exposure: null }];
  },
};
const svc = new LocationService(fakeProvider);

test('places success and empty input validation', async () => {
  const good = await handleSearchPlaces({ q: 'Viman', lat: String(origin.lat), lng: String(origin.lng) }, 'r1', svc);
  assert.equal(good.statusCode, 200);
  assert.equal(JSON.parse(good.body).data.places[0].placeId, 'p-1');
  for (const bad of [{ q: '' }, { q: 'vim', lat: '19' }, { q: 'vim', limit: '100' }, { q: 'vim', lat: '91', lng: '0' }]) {
    assert.equal((await handleSearchPlaces(bad, 'r1', svc)).statusCode, 400);
  }
});

test('routing succeeds without fabricated exposure advice', async () => {
  const response = await handlePlanRoute({ origin, destination: dest, travelMode: 'SCOOTER' }, 'r2', svc);
  const parsed = JSON.parse(response.body);
  assert.equal(response.statusCode, 200);
  assert.equal(parsed.data.analysisStatus, 'ROUTES_ONLY');
  assert.equal(parsed.data.recommendedRouteId, null);
  assert.equal(parsed.data.routes[0].exposure, null);
});

test('routing rejects unsafe input', async () => {
  for (const body of [null, { origin: dest, destination: dest, travelMode: 'SCOOTER' }, { origin: { lat: 200, lng: 0 }, destination: dest, travelMode: 'SCOOTER' }, { origin, destination: dest, travelMode: 'CAR' }]) {
    assert.equal((await handlePlanRoute(body, 'r3', svc)).statusCode, 400);
  }
});

test('provider errors are safe and return helpful status codes', async () => {
  const bad = new LocationService({
    searchPlaces: async () => { throw new LocationProviderError('Temporarily unavailable'); },
    calculateRoutes: async () => { throw new RouteUnavailableError('No route'); },
  });
  assert.equal((await handleSearchPlaces({ q: 'Test' }, 'r4', bad)).statusCode, 502);
  const noRoute = await handlePlanRoute({ origin, destination: dest, travelMode: 'SCOOTER' }, 'r4', bad);
  assert.equal(noRoute.statusCode, 422);
  assert.equal(JSON.parse(noRoute.body).error.code, 'ROUTE_NOT_AVAILABLE');
});
