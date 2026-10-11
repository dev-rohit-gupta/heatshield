import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { AwsLocationProvider } from '../src/providers/aws-location.provider';

test('AWS requests keep scooter mode and longitude-first coordinates', async () => {
  const places = {
    send: async (command: { input: Record<string, unknown> }) => {
      assert.equal(command.input.QueryText, 'Viman Nagar');
      assert.deepEqual(command.input.BiasPosition, [73.8567, 18.5204]);
      assert.equal(command.input.TravelMode, 'Scooter');
      assert.equal(command.input.IntendedUse, 'SingleUse');
      return { ResultItems: [{ PlaceId: 'place1', Title: 'Viman Nagar', Position: [73.91, 18.56] }] };
    },
  };
  const routes = {
    send: async (command: { input: Record<string, unknown> }) => {
      assert.deepEqual(command.input.Origin, [73.8567, 18.5204]);
      assert.deepEqual(command.input.Destination, [73.91, 18.56]);
      assert.equal(command.input.TravelMode, 'Scooter');
      assert.equal(command.input.LegGeometryFormat, 'Simple');
      assert.equal(command.input.MaxAlternatives, 2);
      return { Routes: [{ Summary: { Distance: 7000, Duration: 1200 }, Legs: [{ Geometry: { LineString: [[73.8567, 18.5204], [73.91, 18.56]] } }] }] };
    },
  };
  const adapter = new AwsLocationProvider(places as never, routes as never);
  const found = await adapter.searchPlaces('Viman Nagar', { lat: 18.5204, lng: 73.8567 }, 5);
  assert.deepEqual(found[0].location, { lat: 18.56, lng: 73.91 });
  const tripRoutes = await adapter.calculateRoutes({ lat: 18.5204, lng: 73.8567 }, { lat: 18.56, lng: 73.91 });
  assert.equal(tripRoutes.length, 1);
  assert.equal(tripRoutes[0].distanceMeters, 7000);
});
