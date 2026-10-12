import { createContext, useCallback, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';
import { AppState } from 'react-native';
import { ShiftCoordinator } from './shift-coordinator';
import { LocalShiftRepository } from './shift-repository';
import { ForegroundWeatherSource } from './shift-weather.port';
import type { ShiftArchive } from './shift-repository';
import { AndroidBackgroundTracker } from './background-tracker';
import { clearBackgroundPresence, lastBackgroundPresence } from './background-observations';

const coordinator = new ShiftCoordinator(new LocalShiftRepository(), new ForegroundWeatherSource());
const tracker = new AndroidBackgroundTracker();
type ContextValue = {
  data: ShiftArchive;
  ready: boolean;
  error: string | null;
  start: () => Promise<void>;
  end: () => Promise<void>;
  setEnvironment: (v: 'OUTDOORS' | 'INDOORS' | 'UNKNOWN') => Promise<void>;
  setActivity: (v: 'WORKING' | 'RESTING') => Promise<void>;
  refreshWeather: () => Promise<void>;
  backgroundEnabled: boolean;
  lastBackgroundSample: string | null;
  enableBackground: () => Promise<void>;
  disableBackground: () => Promise<void>;
};
const ShiftContext = createContext<ContextValue | null>(null);

export function ShiftProvider({ children }: PropsWithChildren) {
  const [data, setData] = useState<ShiftArchive>(coordinator.getSnapshot());
  const [ready, setReady] = useState(coordinator.isReady());
  const [error, setError] = useState<string | null>(null);
  const [backgroundEnabled, setBackgroundEnabled] = useState(false);
  const [lastBackgroundSample, setLastBackgroundSample] = useState<string | null>(null);
  const refreshTracking = useCallback(async () => {
    setBackgroundEnabled(await tracker.isRunning());
    const shiftId = coordinator.getSnapshot().active?.id;
    setLastBackgroundSample(shiftId ? await lastBackgroundPresence(shiftId) : null);
  }, []);
  const run = useCallback(async (operation: () => Promise<unknown>) => {
    setError(null);
    try { await operation(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Unable to save shift.'); }
  }, []);

  useEffect(() => {
    const unsub = coordinator.subscribe(setData);
    coordinator.initialize().then(async () => {
      // Avoid leaving the Android foreground service running without an active shift.
      if (!coordinator.getSnapshot().active) await tracker.disable();
      await refreshTracking();
      setReady(true);
    }).catch(e => setError(e instanceof Error ? e.message : 'Unable to load shift.'));
    return unsub;
  }, [refreshTracking]);

  useEffect(() => {
    if (!ready) return;
    const timer = setInterval(() => {
      if (AppState.currentState === 'active') void run(() => coordinator.tick());
    }, 30_000);
    const listener = AppState.addEventListener('change', (state) => {
      if (state !== 'active') void run(() => coordinator.tick());
      else {
        void run(async () => {
          await coordinator.tick(false); // unobserved time while backgrounded
          if (coordinator.getSnapshot().active) await coordinator.refreshWeather();
          await refreshTracking();
        });
      }
    });
    return () => { clearInterval(timer); listener.remove(); };
  }, [ready, run, refreshTracking]);

  useEffect(() => {
    if (!ready || !data.active) return;
    const timer = setInterval(() => { if (AppState.currentState === 'active') void coordinator.refreshWeather(); }, 15 * 60_000);
    return () => clearInterval(timer);
  }, [data.active?.id, ready]);

  const value = useMemo<ContextValue>(() => ({
    data, ready, error, backgroundEnabled, lastBackgroundSample,
    start: () => run(async () => { await coordinator.start(); await coordinator.refreshWeather(); }),
    end: () => run(async () => {
      const shiftId = coordinator.getSnapshot().active?.id;
      // First commit the completed shift atomically with its outbox event.
      await coordinator.end();
      try { await tracker.disable(); } finally { await refreshTracking(); }
      if (shiftId) await clearBackgroundPresence(shiftId);
    }),
    setEnvironment: v => run(() => coordinator.setEnvironment(v)),
    setActivity: v => run(() => coordinator.setActivity(v)),
    refreshWeather: () => run(() => coordinator.refreshWeather()),
    enableBackground: () => run(async () => {
      if (!coordinator.getSnapshot().active) throw new Error('Start a shift before enabling background sampling.');
      await tracker.enable();
      await refreshTracking();
    }),
    disableBackground: () => run(async () => {
      await tracker.disable();
      await refreshTracking();
    }),
  }), [data, ready, error, run, backgroundEnabled, lastBackgroundSample, refreshTracking]);
  return <ShiftContext.Provider value={value}>{children}</ShiftContext.Provider>;
}

export function useShift(): ContextValue {
  const context = useContext(ShiftContext);
  if (!context) throw new Error('useShift must be used within ShiftProvider.');
  return context;
}
