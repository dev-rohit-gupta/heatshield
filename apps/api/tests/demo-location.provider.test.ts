import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DemoLocationProvider } from '../src/providers/demo-location.provider';
import { LocationService } from '../src/services/location.service';
import { WeatherRouteExposureAnalyzer } from '../src/services/route-exposure.service';
import { getDemoWeather } from '../src/services/demo-weather.service';

const origin = { lat: 18.5204, lng: 73.8567 };

test('explicit demo search + route comparison do not need AWS', async () => {
  const provider = new DemoLocationProvider();
  const service = new LocationService(provider, new WeatherRouteExposureAnalyzer(getDemoWeather));
  const { places } = await service.search('viman', origin, 5);
  assert.equal(places.length, 1);
  const result = await service.plan(origin, places[0].location);
  assert.equal(result.routeSource, 'DEMO');
  assert.equal(result.analysisStatus, 'SCREENED');
  assert.equal(result.recommendedRouteId, 'demo_fast');
  assert.equal(result.routes[0].exposure?.weatherSource, 'DEMO_SAMPLE');
  assert.match(result.notice, /DEMO ONLY/);
});

test('demo provider does not invent paths for arbitrary locations', async () => {
  const provider = new DemoLocationProvider();
  await assert.rejects(() => provider.calculateRoutes({ lat: 19, lng: 74 }, { lat: 18.5679, lng: 73.9143 }));
  await assert.rejects(() => provider.calculateRoutes(origin, { lat: 18.499, lng: 73.91 }));
});

test('demo near other cities does not show misleading search suggestions', async () => {
  const provider = new DemoLocationProvider();
  assert.deepEqual(await provider.searchPlaces('viman', { lat: 28.61, lng: 77.2 }, 5), []);
});
