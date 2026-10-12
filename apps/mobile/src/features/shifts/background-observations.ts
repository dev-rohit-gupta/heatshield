import AsyncStorage from '@react-native-async-storage/async-storage';
import { LocalShiftRepository } from './shift-repository';

/** No latitude, longitude, altitude, heading, or speed ever reach persistence. */
const PREFIX = '@heatshield/bg-presence/v1/';
const BUCKET_MS = 15 * 60_000;

/** Pure, deterministic key: at most one timestamp per shift per 15-minute bucket. */
export function observationKey(shiftId: string, timestampMs: number): string {
  if (!shiftId || !Number.isFinite(timestampMs) || timestampMs < 0) throw new RangeError('Invalid observation.');
  return `${PREFIX}${encodeURIComponent(shiftId)}/${Math.floor(timestampMs / BUCKET_MS)}`;
}

export async function recordBackgroundPresence(samples: readonly { timestamp: number; accuracy?: number | null }[]): Promise<void> {
  const { active } = await new LocalShiftRepository().read();
  if (!active) return;
  const now = Date.now();
  const start = Date.parse(active.startedAt);
  if (!Number.isFinite(start)) return;
  // Accept only sensible, recent fixes. Never persist the GPS coordinates themselves.
  const recent = samples.filter(sample => Number.isFinite(sample.timestamp)
    && sample.timestamp >= start && sample.timestamp <= now + 60_000
    && sample.timestamp >= now - 10 * 60_000
    && sample.accuracy !== null && sample.accuracy !== undefined
    && Number.isFinite(sample.accuracy) && sample.accuracy >= 0 && sample.accuracy <= 500);
  if (recent.length === 0) return;
  const lastAt = Math.max(...recent.map(sample => sample.timestamp));
  await AsyncStorage.setItem(observationKey(active.id, lastAt), new Date(lastAt).toISOString());
}

export async function lastBackgroundPresence(shiftId: string): Promise<string | null> {
  const prefix = `${PREFIX}${encodeURIComponent(shiftId)}/`;
  const keys = (await AsyncStorage.getAllKeys()).filter(key => key.startsWith(prefix));
  if (!keys.length) return null;
  // Buckets sort numerically, so the newest bucket is the largest key suffix.
  const newest = keys.sort((a, b) => Number(b.slice(prefix.length)) - Number(a.slice(prefix.length)))[0];
  return newest ? AsyncStorage.getItem(newest) : null;
}

export async function clearBackgroundPresence(shiftId: string): Promise<void> {
  const prefix = `${PREFIX}${encodeURIComponent(shiftId)}/`;
  const keys = (await AsyncStorage.getAllKeys()).filter(key => key.startsWith(prefix));
  if (keys.length) await AsyncStorage.multiRemove(keys);
}
