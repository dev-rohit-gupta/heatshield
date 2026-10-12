import assert from 'node:assert/strict';
import { test } from 'node:test';
import { startShift, endShift } from '../src/shift-tracker';
import { acknowledgeShiftEvents, completedShiftEvent, enqueueCompletedShift } from '../src/shift-sync';
const initial = '2026-10-12T10:00:00.000Z';
const finished = '2026-10-12T10:03:00.000Z';
const complete = endShift(startShift('shift-example', initial), finished, null);

test('offline event contains a deterministic ID and no coordinates', () => {
  const event = completedShiftEvent(complete);
  assert.equal(event.id, 'shift:shift-example:completed:v1');
  assert.equal(event.payload.summary.unassessedSeconds, 180);
  assert.equal(JSON.stringify(event).includes('latitude'), false);
  assert.equal(JSON.stringify(event).includes('longitude'), false);
});

test('enqueue is idempotent after retries and app restarts', () => {
  const once = enqueueCompletedShift([], complete);
  assert.deepEqual(enqueueCompletedShift(once, complete), once);
});

test('incomplete shifts cannot be synchronized as completed', () => {
  assert.throws(() => completedShiftEvent(startShift('active', initial)));
});

test('only acknowledged event IDs leave the queue', () => {
  const a = completedShiftEvent(complete);
  const b = completedShiftEvent(endShift(startShift('another', initial), finished, null));
  assert.deepEqual(acknowledgeShiftEvents([a, b], ['unknown', a.id]), [b]);
  assert.deepEqual(acknowledgeShiftEvents([b], [a.id]), [b]);
});
