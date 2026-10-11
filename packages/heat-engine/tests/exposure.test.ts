import assert from 'node:assert/strict';
import test from 'node:test';
import { evaluateExposureSegment, summarizeExposure } from '../src/exposure';

test('counts outdoor time by NWS screening band', () => {
  const outdoor = evaluateExposureSegment({ durationSeconds: 300, environment: 'OUTDOORS', temperatureC: 35, relativeHumidityPct: 65 });
  const summary = summarizeExposure([outdoor]);
  assert.equal(summary.screenedOutdoorSeconds, 300);
  assert.equal(Object.values(summary.byBandSeconds).reduce((x, y) => x + y, 0), 300);
});

test('does not score indoor or unknown time with outdoor model weather', () => {
  const summary = summarizeExposure([
    evaluateExposureSegment({ durationSeconds: 600, environment: 'INDOORS', temperatureC: 40, relativeHumidityPct: 70 }),
    evaluateExposureSegment({ durationSeconds: 400, environment: 'UNKNOWN' }),
    evaluateExposureSegment({ durationSeconds: 200, environment: 'OUTDOORS' }),
  ]);
  assert.equal(summary.screenedOutdoorSeconds, 0);
  assert.equal(summary.indoorSeconds, 600);
  assert.equal(summary.unassessedSeconds, 600);
  assert.equal(summary.totalSeconds, 1200);
});

test('rejects negative, fractional and oversized time intervals', () => {
  for (const durationSeconds of [-1, 0.5, 86401]) {
    assert.throws(() => evaluateExposureSegment({ durationSeconds, environment: 'OUTDOORS' }), RangeError);
  }
});
