import assert from 'node:assert/strict';
import { test } from 'node:test';
import { compareRouteOutdoorTime } from '../src/route-screening';

const hot = { temperatureC: 35, relativeHumidityPct: 70 };

test('uses the same area heat index for both routes and compares time only', () => {
  const data = compareRouteOutdoorTime([
    { routeId: 'slow', durationSeconds: 1500 },
    { routeId: 'fast', durationSeconds: 900 },
  ], hot);
  assert.equal(data.routes[0].heatIndexC, data.routes[1].heatIndexC);
  assert.equal(data.routes[0].band, data.routes[1].band);
  assert.equal(data.recommendedRouteId, 'fast');
  assert.equal(data.minutesSaved, 10);
  assert.equal(data.reasonCode, 'LESS_TIME_OUTDOORS');
});

test('does not invent meaningful savings for 60-second differences', () => {
  const data = compareRouteOutdoorTime([
    { routeId: 'a', durationSeconds: 1020 },
    { routeId: 'b', durationSeconds: 1080 },
  ], hot);
  assert.equal(data.recommendedRouteId, null);
  assert.equal(data.minutesSaved, 0);
  assert.equal(data.reasonCode, 'NO_MEANINGFUL_DIFFERENCE');
});

test('a single route does not generate a claimed benefit', () => {
  assert.equal(compareRouteOutdoorTime([{ routeId: 'only', durationSeconds: 700 }], hot).recommendedRouteId, null);
});

test('rejects unsupported durations and duplicate route IDs', () => {
  for (const routes of [
    [{ routeId: 'x', durationSeconds: 0 }],
    [{ routeId: 'x', durationSeconds: 3601 }],
    [{ routeId: 'x', durationSeconds: 1.5 }],
    [{ routeId: 'x', durationSeconds: 100 }, { routeId: 'x', durationSeconds: 300 }],
  ]) assert.throws(() => compareRouteOutdoorTime(routes, hot), RangeError);
});
