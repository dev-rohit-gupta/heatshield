import * as Location from 'expo-location';
import { HEATSHIELD_LOCATION_TASK } from './background-location-task';

export interface BackgroundTracker {
  isRunning(): Promise<boolean>;
  enable(): Promise<void>;
  disable(): Promise<void>;
}

/** Android foreground-service sampling during an explicitly opted-in active shift. */
export class AndroidBackgroundTracker implements BackgroundTracker {
  isRunning(): Promise<boolean> {
    return Location.hasStartedLocationUpdatesAsync(HEATSHIELD_LOCATION_TASK);
  }

  async enable(): Promise<void> {
    if (await this.isRunning()) return;
    const foreground = await Location.requestForegroundPermissionsAsync();
    if (!foreground.granted) throw new Error('Allow location while using the app first.');
    // Android 11+ may open system settings. This action is only invoked from a user tap.
    const background = await Location.requestBackgroundPermissionsAsync();
    if (!background.granted) throw new Error('Choose Allow all the time in Android location settings to enable optional background tracking.');
    await Location.startLocationUpdatesAsync(HEATSHIELD_LOCATION_TASK, {
      accuracy: Location.Accuracy.Balanced,
      distanceInterval: 50,
      timeInterval: 60_000,
      foregroundService: {
        notificationTitle: 'HeatShield shift location sampling',
        notificationBody: 'Active during your shift. Turn it off from HeatShield.',
      },
    });
  }

  async disable(): Promise<void> {
    if (await this.isRunning()) await Location.stopLocationUpdatesAsync(HEATSHIELD_LOCATION_TASK);
  }
}
