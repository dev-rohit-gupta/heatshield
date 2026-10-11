import assert from 'node:assert/strict';
import test from 'node:test';
import { calculateHeatIndexC, screenHeatIndex, classifyHeatIndexC } from '../src/heat-index';

test('matches NWS reference neighborhood: 90 F, 70% RH is near 106 F', () => {
  const valueC = calculateHeatIndexC((90 - 32) * 5 / 9, 70);
  const valueF = valueC * 9 / 5 + 32;
  assert.ok(valueF > 104 && valueF < 108, `returned ${valueF} F`);
});

test('uses a simple equation below the 80 F threshold, not the high-heat regression', () => {
  const value = calculateHeatIndexC(20, 50);
  assert.ok(value > 17 && value < 23);
  assert.equal(classifyHeatIndexC(value), 'BELOW_CAUTION');
});

test('applies dry and very humid adjustments', () => {
  const dry = calculateHeatIndexC((100 - 32) * 5 / 9, 10);
  const humid = calculateHeatIndexC((85 - 32) * 5 / 9, 95);
  assert.ok(Number.isFinite(dry));
  assert.ok(Number.isFinite(humid));
});

test('classifies NWS categories at documented Fahrenheit boundaries', () => {
  const toC = (f: number) => (f - 32) * 5 / 9;
  assert.equal(classifyHeatIndexC(toC(79)), 'BELOW_CAUTION');
  assert.equal(classifyHeatIndexC(toC(85)), 'CAUTION');
  assert.equal(classifyHeatIndexC(toC(95)), 'EXTREME_CAUTION');
  assert.equal(classifyHeatIndexC(toC(110)), 'DANGER');
  assert.equal(classifyHeatIndexC(toC(130)), 'EXTREME_DANGER');
});

test('rejects invalid inputs and does not invent a personal safety score', () => {
  assert.throws(() => calculateHeatIndexC(Number.NaN, 50), RangeError);
  assert.throws(() => calculateHeatIndexC(35, -1), RangeError);
  assert.throws(() => calculateHeatIndexC(35, 101), RangeError);
  assert.throws(() => calculateHeatIndexC(90, 50), RangeError);
  const reading = screenHeatIndex(35, 50);
  assert.match(reading.limitation, /Not a safety clearance/);
  assert.equal('estimatedScore' in reading, false);
});
