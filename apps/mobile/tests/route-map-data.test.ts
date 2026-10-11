import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { computeRouteBounds, selectMapStyleUrl, splitRouteCollections } from '../src/features/routes/route-map-data.ts';

const origin = { lat: 18.5204, lng: 73.8567 };
const destination = { lat: 18.5622, lng: 73.9167 };
const routes = [
  {
    routeId: 'fast', type: 'FASTEST', durationSeconds: 800, distanceMeters: 3400,
    geometry: { type: 'LineString', coordinates: [[73.8567, 18.5204], [73.885, 18.541], [73.9167, 18.5622]] }, exposure: null,
  },
  {
    routeId: 'other', type: 'ALTERNATIVE', durationSeconds: 1000, distanceMeters: 3700,
    geometry: { type: 'LineString', coordinates: [[73.8567, 18.5204], [73.882, 18.550], [73.9167, 18.5622]] }, exposure: null,
  },
] as const;

describe('MapLibre-independent route map data', () => {
  it('separates selected from alternate GeoJSON lines', () => {
    const result = splitRouteCollections(routes as never, 'other');
    assert.equal(result.selected.features.length, 1);
    assert.equal(result.selected.features[0].properties.routeId, 'other');
    assert.equal(result.alternatives.features[0].properties.routeId, 'fast');
    assert.deepEqual(result.selected.features[0].geometry.coordinates[0], [73.8567, 18.5204]);
  });
  it('skips invalid or degenerate route geometry instead of drawing made-up lines', () => {
    const broken = { ...routes[0], geometry: { type: 'LineString', coordinates: [[181, 100], [73.9, 18.5]] } };
    const result = splitRouteCollections([broken] as never, 'fast');
    assert.equal(result.selected.features.length, 0);
  });
  it('fits the endpoints and route geometry within a padded viewport', () => {
    const [west, south, east, north] = computeRouteBounds(origin, destination, routes as never);
    assert.ok(west < origin.lng && south < origin.lat);
    assert.ok(east > destination.lng && north > destination.lat);
  });
  it('keeps a visible viewport even if origin equals destination', () => {
    const bounds = computeRouteBounds(origin, origin, []);
    assert.ok(bounds[2] > bounds[0] && bounds[3] > bounds[1]);
  });
  it('uses a public OpenFreeMap style and allows HTTPS overrides', () => {
    assert.equal(selectMapStyleUrl(undefined), 'https://tiles.openfreemap.org/styles/liberty');
    assert.equal(selectMapStyleUrl('http://example.com/style.json'), 'https://tiles.openfreemap.org/styles/liberty');
    assert.equal(selectMapStyleUrl('https://tiles.example.com/style.json'), 'https://tiles.example.com/style.json');
  });
});
