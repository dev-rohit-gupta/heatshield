import { createContext, useCallback, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';
import { AppState } from 'react-native';
import { ShiftCoordinator } from './shift-coordinator';
import { LocalShiftRepository } from './shift-repository';
import { ForegroundWeatherSource } from './shift-weather.port';
import type { ShiftArchive } from './shift-repository';

const coordinator = new ShiftCoordinator(new LocalShiftRepository(), new ForegroundWeatherSource());
type ContextValue = {
  data: ShiftArchive;
  ready: boolean;
  error: string | null;
  start: () => Promise<void>;
  end: () => Promise<void>;
  setEnvironment: (v: 'OUTDOORS' | 'INDOORS' | 'UNKNOWN') => Promise<void>;
  setActivity: (v: 'WORKING' | 'RESTING') => Promise<void>;
  refreshWeather: () => Promise<void>;
};
const ShiftContext = createContext<ContextValue | null>(null);

export function ShiftProvider({ children }: PropsWithChildren) {
  const [data, setData] = useState<ShiftArchive>(coordinator.getSnapshot());
  const [ready, setReady] = useState(coordinator.isReady());
  const [error, setError] = useState<string | null>(null);
  const run = useCallback(async (operation: () => Promise<unknown>) => {
    setError(null);
    try { await operation(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Unable to save shift.'); }
  }, []);

  useEffect(() => {
    const unsub = coordinator.subscribe(setData);
    coordinator.initialize().then(() => setReady(true)).catch(e => setError(e instanceof Error ? e.message : 'Unable to load shift.'));
    return unsub;
  }, []);

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
        });
      }
    });
    return () => { clearInterval(timer); listener.remove(); };
  }, [ready, run]);

  useEffect(() => {
    if (!ready || !data.active) return;
    const timer = setInterval(() => { if (AppState.currentState === 'active') void coordinator.refreshWeather(); }, 15 * 60_000);
    return () => clearInterval(timer);
  }, [data.active?.id, ready]);

  const value = useMemo<ContextValue>(() => ({
    data, ready, error,
    start: () => run(async () => { await coordinator.start(); await coordinator.refreshWeather(); }),
    end: () => run(() => coordinator.end()),
    setEnvironment: v => run(() => coordinator.setEnvironment(v)),
    setActivity: v => run(() => coordinator.setActivity(v)),
    refreshWeather: () => run(() => coordinator.refreshWeather()),
  }), [data, ready, error, run]);
  return <ShiftContext.Provider value={value}>{children}</ShiftContext.Provider>;
}

export function useShift(): ContextValue {
  const context = useContext(ShiftContext);
  if (!context) throw new Error('useShift must be used within ShiftProvider.');
  return context;
}
