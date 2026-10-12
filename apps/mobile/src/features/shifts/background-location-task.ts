import * as TaskManager from 'expo-task-manager';
import type { LocationObject } from 'expo-location';
import { recordBackgroundPresence } from './background-observations';

export const HEATSHIELD_LOCATION_TASK = 'heatshield-rider-background-presence-v1';

type LocationTaskData = { locations?: LocationObject[] };

/** Module-scope registration: runs even when React screens are not mounted. */
TaskManager.defineTask<LocationTaskData>(HEATSHIELD_LOCATION_TASK, async ({ data, error }) => {
  if (error || !data?.locations?.length) return;
  try {
    await recordBackgroundPresence(data.locations.map(location => ({
      timestamp: location.timestamp,
      accuracy: location.coords.accuracy,
    })));
  } catch (cause) {
    // Do not log location or credentials. The native scheduler can retry future samples.
    console.warn('HeatShield background sampling failed', cause instanceof Error ? cause.name : 'unknown');
  }
});
