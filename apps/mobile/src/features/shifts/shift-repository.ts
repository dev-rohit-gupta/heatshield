import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ShiftLedger } from '@heatshield/heat-engine';

export type ShiftArchive = { active: ShiftLedger | null; history: ShiftLedger[] };
export interface ShiftRepository {
  read(): Promise<ShiftArchive>;
  write(value: ShiftArchive): Promise<void>;
}

const KEY = '@heatshield/shift-ledger/v1';
const EMPTY: ShiftArchive = { active: null, history: [] };

/** Offline-first, on-device storage; no raw coordinates, identity, or access keys. */
export class LocalShiftRepository implements ShiftRepository {
  async read(): Promise<ShiftArchive> {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return { ...EMPTY };
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== 'object' || !('history' in value) || !Array.isArray(value.history)
      || !('active' in value)) throw new Error('Saved shift history is invalid.');
    return value as ShiftArchive;
  }

  async write(value: ShiftArchive): Promise<void> {
    await AsyncStorage.setItem(KEY, JSON.stringify(value));
  }
}
