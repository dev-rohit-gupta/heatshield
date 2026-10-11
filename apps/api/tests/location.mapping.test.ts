import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { mapPlaceItems, mapRouteItems } from '../src/providers/aws-location.provider';

test('AWS places use [lng,lat] but app uses {lat,lng}', () => {
  const result = mapPlaceItems([{ PlaceId: 'abc', Title: 'Sample', Position: [73.9, 18.5], Address: { Label: 'Sample address' } }, { PlaceId: 'bad', Title: 'Bad', Position: [200, 95] }]);
  assert.deepEqual(result, [{ placeId: 'abc', name: 'Sample', address: 'Sample address', location: { lat: 18.5, lng: 73.9 } }]);
});

test('routes are ordered by time and correctly combine multiple geometry legs', () => {
  const routes = mapRouteItems([
    { Summary: { Distance: 9500, Duration: 1500 }, Legs: [{ Geometry: { LineString: [[73.8, 18.5], [73.9, 18.6]] } }] },
    { Summary: { Distance: 6500, Duration: 1100 }, Legs: [{ Geometry: { LineString: [[73.8, 18.5], [73.85, 18.55]] } }, { Geometry: { LineString: [[73.85, 18.55], [73.9, 18.6]] } }] },
  ]);
  assert.equal(routes[0].type, 'FASTEST');
  assert.equal(routes[0].durationSeconds, 1100);
  assert.deepEqual(routes[0].geometry.coordinates, [[73.8, 18.5], [73.85, 18.55], [73.9, 18.6]]);
  assert.equal(routes[1].type, 'ALTERNATIVE');
});

test('missing geometry does not produce a fake straight-line road route', () => {
  assert.equal(mapRouteItems([{ Summary: { Distance: 500, Duration: 40 }, Legs: [] }]).length, 0);
});
