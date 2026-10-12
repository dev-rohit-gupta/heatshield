import assert from 'node:assert/strict';
import { test } from 'node:test';
import { advanceShift, changeShiftEnvironment, endShift, startShift, summarizeShift, verifiedWeather, type WeatherEvidence } from '../src/shift-tracker';

const at = (min: number) => new Date(Date.UTC(2026, 9, 12, 10, min, 0)).toISOString();
const weather: WeatherEvidence = {
  temperatureC: 35, relativeHumidityPct: 65, validAt: at(0), fetchedAt: at(0), source: 'MODEL_ESTIMATE',
};

test('new shift begins unknown; never assumes outdoor status', () => {
  const shift = advanceShift(startShift('s1', at(0)), at(1), weather);
  assert.equal(summarizeShift(shift).unassessedSeconds, 60);
  assert.equal(summarizeShift(shift).screenedOutdoorSeconds, 0);
});

test('outdoor with fresh model weather is classified; indoor is excluded', () => {
  let shift = changeShiftEnvironment(startShift('s1', at(0)), 'OUTDOORS', at(0), weather);
  shift = advanceShift(shift, at(2), weather);
  shift = changeShiftEnvironment(shift, 'INDOORS', at(2), weather);
  shift = advanceShift(shift, at(4), weather);
  const sum = summarizeShift(shift);
  assert.equal(sum.screenedOutdoorSeconds, 120);
  assert.equal(sum.indoorSeconds, 120);
  assert.equal(sum.totalSeconds, 240);
});

test('double delivery and time rollback do not double count', () => {
  const shift = advanceShift(startShift('s1', at(0)), at(2), weather);
  assert.deepEqual(advanceShift(shift, at(2), weather), shift);
  assert.deepEqual(advanceShift(shift, at(1), weather), shift);
});

test('long callback gap is fully unassessed', () => {
  let shift = changeShiftEnvironment(startShift('s1', at(0)), 'OUTDOORS', at(0), weather);
  shift = advanceShift(shift, at(10), weather);
  assert.equal(summarizeShift(shift).unassessedSeconds, 600);
  assert.equal(summarizeShift(shift).screenedOutdoorSeconds, 0);
});

test('suspended tracking is not backfilled as assessed', () => {
  const shift = advanceShift(startShift('s1', at(0)), at(2), weather, false);
  assert.equal(summarizeShift(shift).unassessedSeconds, 120);
});

test('old weather is unassessed and demo weather is never assessed', () => {
  assert.equal(verifiedWeather(weather, at(31)), null);
  assert.equal(verifiedWeather({ ...weather, source: 'DEMO_SAMPLE' }, at(1)), null);
  let shift = changeShiftEnvironment(startShift('s1', at(30)), 'OUTDOORS', at(30), weather);
  shift = advanceShift(shift, at(32), weather);
  assert.equal(summarizeShift(shift).unassessedSeconds, 120);
});

test('context switch accounts old context then changes, end is idempotent', () => {
  let shift = startShift('s1', at(0));
  shift = changeShiftEnvironment(shift, 'OUTDOORS', at(1), weather);
  shift = endShift(shift, at(3), weather);
  assert.equal(shift.status, 'ENDED');
  assert.equal(summarizeShift(shift).unassessedSeconds, 60);
  assert.equal(summarizeShift(shift).screenedOutdoorSeconds, 120);
  assert.deepEqual(endShift(shift, at(4), weather), shift);
});

test('segments coalesce so storage does not grow each minute', () => {
  let shift = changeShiftEnvironment(startShift('s1', at(0)), 'OUTDOORS', at(0), weather);
  shift = advanceShift(shift, at(1), weather);
  shift = advanceShift(shift, at(2), weather);
  assert.equal(shift.segments.length, 1);
  assert.equal(shift.segments[0]?.durationSeconds, 120);
});

test('invalid context is rejected', () => {
  assert.throws(() => changeShiftEnvironment(startShift('s1', at(0)), 'SOMEWHERE' as never, at(1), weather), RangeError);
});


test('reopening a shift after multiple days never breaks restoration', () => {
  const resumed = advanceShift(startShift('s1', at(0)), '2026-10-15T10:00:00.000Z', null, false);
  assert.equal(resumed.status, 'ACTIVE');
  assert.ok(summarizeShift(resumed).unassessedSeconds > 2 * 86400);
});
