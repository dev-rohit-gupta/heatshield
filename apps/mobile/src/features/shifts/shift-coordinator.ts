import {
  advanceShift, changeShiftActivity, changeShiftEnvironment, endShift,
  startShift, summarizeShift, type ShiftLedger, type WeatherEvidence,
  type ExposureEnvironment,
} from '@heatshield/heat-engine';
import type { ShiftArchive, ShiftRepository } from './shift-repository';
import type { ShiftWeatherSource } from './shift-weather.port';

/** Serializes every state transition, avoiding overlapping timer/button writes. */
export class ShiftCoordinator {
  private state: ShiftArchive = { active: null, history: [] };
  private weather: WeatherEvidence | null = null;
  private weatherRequestId = 0;
  private ready = false;
  private queue: Promise<unknown> = Promise.resolve();
  private listeners = new Set<(snapshot: ShiftArchive) => void>();

  constructor(private readonly repository: ShiftRepository,
    private readonly weatherSource: ShiftWeatherSource,
    private readonly clock: () => string = () => new Date().toISOString(),
    private readonly idFactory: () => string = () => `shift_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`) {}

  getSnapshot(): ShiftArchive { return this.state; }
  isReady(): boolean { return this.ready; }
  subscribe(listener: (state: ShiftArchive) => void): () => void {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }
  private emit(): void { for (const listener of this.listeners) listener(this.state); }

  private serialize<T>(work: () => Promise<T>): Promise<T> {
    const next = this.queue.then(work, work);
    this.queue = next.then(() => undefined, () => undefined);
    return next;
  }

  initialize(): Promise<void> {
    return this.serialize(async () => {
      if (this.ready) return;
      const stored = await this.repository.read();
      // Time spent while app was closed was NOT observed: keep it unassessed.
      if (stored.active) stored.active = advanceShift(stored.active, this.clock(), null, false);
      this.state = stored;
      if (stored.active) await this.repository.write(stored);
      this.ready = true;
      this.emit();
    });
  }

  private async persist(next: ShiftArchive): Promise<void> {
    await this.repository.write(next);  // only publish after the write succeeded
    this.state = next;
    this.emit();
  }

  start(): Promise<ShiftLedger> {
    return this.serialize(async () => {
      if (!this.ready) throw new Error('Shift history is still loading.');
      if (this.state.active) throw new Error('A shift is already active.');
      const shift = startShift(this.idFactory(), this.clock());
      this.weatherRequestId++; // invalidate any refresh from the previous shift
      this.weather = null;
      await this.persist({ ...this.state, active: shift });
      return shift;
    });
  }

  /** Background/resume paths pass trackingActive=false so no time is misclassified. */
  tick(trackingActive = true): Promise<void> {
    return this.serialize(async () => {
      if (!this.state.active) return;
      const active = advanceShift(this.state.active, this.clock(), this.weather, trackingActive);
      if (active === this.state.active) return;
      await this.persist({ ...this.state, active });
    });
  }

  setEnvironment(environment: ExposureEnvironment): Promise<void> {
    return this.serialize(async () => {
      if (!this.state.active) throw new Error('Start a shift first.');
      const active = changeShiftEnvironment(this.state.active, environment, this.clock(), this.weather);
      await this.persist({ ...this.state, active });
    });
  }

  setActivity(activity: 'WORKING' | 'RESTING'): Promise<void> {
    return this.serialize(async () => {
      if (!this.state.active) throw new Error('Start a shift first.');
      const active = changeShiftActivity(this.state.active, activity);
      await this.persist({ ...this.state, active });
    });
  }

  end(): Promise<void> {
    return this.serialize(async () => {
      if (!this.state.active) return;
      const ended = endShift(this.state.active, this.clock(), this.weather);
      await this.persist({ active: null, history: [ended, ...this.state.history].slice(0, 14) });
      this.weatherRequestId++;
      this.weather = null;
    });
  }

  /** Refresh before returning to foreground assessment. Errors leave time unassessed. */
  async refreshWeather(): Promise<'ready' | 'unavailable'> {
    const requestId = ++this.weatherRequestId;
    const shiftId = this.state.active?.id;
    let fresh: WeatherEvidence;
    try { fresh = await this.weatherSource.fetch(); }
    catch {
      if (requestId === this.weatherRequestId) this.weather = null;
      return 'unavailable';
    }
    // Do not apply weather from a prior shift or an older overlapping refresh.
    if (requestId !== this.weatherRequestId || shiftId !== this.state.active?.id) return 'unavailable';
    this.weather = fresh;
    return fresh.source === 'MODEL_ESTIMATE' ? 'ready' : 'unavailable';
  }
}

export function shiftTotals(ledger: ShiftLedger) { return summarizeShift(ledger); }
