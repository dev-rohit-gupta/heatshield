import { summarizeShift, type ShiftLedger } from './shift-tracker';
import type { ExposureSummary } from './exposure';

/** Idempotent, coordinate-free payload. The network transport is deliberately separate. */
export type ShiftSyncEvent = {
  id: string;
  kind: 'SHIFT_COMPLETED';
  shiftId: string;
  createdAt: string;
  payload: {
    startedAt: string;
    endedAt: string;
    summary: ExposureSummary;
  };
};

export function completedShiftEvent(shift: ShiftLedger): ShiftSyncEvent {
  if (shift.status !== 'ENDED' || !shift.endedAt) {
    throw new Error('Only completed shifts can enter the synchronization outbox.');
  }
  return {
    id: `shift:${shift.id}:completed:v1`,
    kind: 'SHIFT_COMPLETED',
    shiftId: shift.id,
    createdAt: shift.endedAt,
    payload: {
      startedAt: shift.startedAt,
      endedAt: shift.endedAt,
      summary: summarizeShift(shift),
    },
  };
}

export function enqueueCompletedShift(events: readonly ShiftSyncEvent[], shift: ShiftLedger): ShiftSyncEvent[] {
  const next = completedShiftEvent(shift);
  return events.some(event => event.id === next.id) ? [...events] : [...events, next];
}

/** Only call once an authenticated backend has acknowledged these exact event IDs. */
export function acknowledgeShiftEvents(events: readonly ShiftSyncEvent[], acknowledgedIds: readonly string[]): ShiftSyncEvent[] {
  const accepted = new Set(acknowledgedIds);
  return events.filter(event => !accepted.has(event.id));
}
