import { evaluateExposureSegment, summarizeExposure, type ExposureEnvironment, type ExposureSegment, type ExposureSummary } from './exposure';

/** Device-local shift ledger. No GPS coordinates or medical profile are stored. */
export type ShiftLedger = {
  id: string;
  status: 'ACTIVE' | 'ENDED';
  startedAt: string;
  endedAt: string | null;
  lastAccountedAt: string;
  environment: ExposureEnvironment;
  activity: 'WORKING' | 'RESTING';
  segments: ExposureSegment[];
};

export type WeatherEvidence = {
  temperatureC: number;
  relativeHumidityPct: number;
  validAt: string;
  fetchedAt: string;
  source: 'MODEL_ESTIMATE' | 'DEMO_SAMPLE';
};

export const MAX_CONTINUOUS_INTERVAL_SECONDS = 300;
export const MAX_WEATHER_AGE_MS = 30 * 60 * 1000;
export const MAX_FORECAST_AGE_MS = 90 * 60 * 1000;

function parseIso(value: string): number {
  const ms = Date.parse(value);
  if (!Number.isFinite(ms)) throw new RangeError('Invalid timestamp.');
  return ms;
}

function validateEnvironment(value: ExposureEnvironment): void {
  if (value !== 'OUTDOORS' && value !== 'INDOORS' && value !== 'UNKNOWN') {
    throw new RangeError('Invalid shift environment.');
  }
}

/** Avoid scoring old or demo weather as a live estimate. */
export function verifiedWeather(weather: WeatherEvidence | null, timeIso: string): WeatherEvidence | null {
  if (!weather || weather.source !== 'MODEL_ESTIMATE') return null;
  const at = parseIso(timeIso);
  const fetched = parseIso(weather.fetchedAt);
  const valid = parseIso(weather.validAt);
  if (at < fetched || at - fetched > MAX_WEATHER_AGE_MS) return null;
  if (Math.abs(at - valid) > MAX_FORECAST_AGE_MS) return null;
  if (!Number.isFinite(weather.temperatureC) || !Number.isFinite(weather.relativeHumidityPct)) return null;
  return weather;
}

export function startShift(id: string, startedAt: string): ShiftLedger {
  if (!id.trim()) throw new RangeError('Shift id is required.');
  parseIso(startedAt);
  return { id, status: 'ACTIVE', startedAt, endedAt: null, lastAccountedAt: startedAt, environment: 'UNKNOWN', activity: 'WORKING', segments: [] };
}

function addSegment(segments: readonly ExposureSegment[], next: ExposureSegment): ExposureSegment[] {
  if (next.durationSeconds === 0) return [...segments];
  const last = segments[segments.length - 1];
  if (last && last.environment === next.environment && last.band === next.band) {
    return [...segments.slice(0, -1), { ...last, durationSeconds: last.durationSeconds + next.durationSeconds }];
  }
  return [...segments, next];
}

/**
 * Advances one ledger exactly once per interval. Long gaps and suspended tracking
 * remain UNASSESSED, never scored with stale weather. The time cursor is monotonic.
 */
export function advanceShift(
  ledger: ShiftLedger,
  at: string,
  weather: WeatherEvidence | null,
  trackingActive = true,
): ShiftLedger {
  if (ledger.status !== 'ACTIVE') return ledger;
  const start = parseIso(ledger.lastAccountedAt);
  const end = parseIso(at);
  if (end <= start) return ledger; // duplicate/late app event: do not double-count
  const durationSeconds = Math.floor((end - start) / 1000);
  if (durationSeconds === 0) return ledger;

  const fresh = verifiedWeather(weather, at);
  const validInterval = trackingActive && durationSeconds <= MAX_CONTINUOUS_INTERVAL_SECONDS;
  let segments = ledger.segments;
  let remaining = durationSeconds;
  while (remaining > 0) {
    // A restored shift may span several days. The exposure evaluator accepts
    // chunks <= 24h; gaps remain UNKNOWN rather than crashing on restoration.
    const seconds = Math.min(remaining, 86_400);
    const segment = evaluateExposureSegment({
      durationSeconds: seconds,
      environment: validInterval ? ledger.environment : 'UNKNOWN',
      ...(fresh && validInterval ? { temperatureC: fresh.temperatureC, relativeHumidityPct: fresh.relativeHumidityPct } : {}),
    });
    segments = addSegment(segments, segment);
    remaining -= seconds;
  }
  return { ...ledger, lastAccountedAt: at, segments };
}

/** Commits time under the PREVIOUS context before switching to the new context. */
export function changeShiftEnvironment(
  ledger: ShiftLedger,
  environment: ExposureEnvironment,
  at: string,
  weather: WeatherEvidence | null,
): ShiftLedger {
  validateEnvironment(environment);
  const advanced = advanceShift(ledger, at, weather);
  return advanced.status === 'ACTIVE' ? { ...advanced, environment } : advanced;
}

/** Resting outside still counts as outdoors; activity never overrides environment. */
export function changeShiftActivity(ledger: ShiftLedger, activity: 'WORKING' | 'RESTING'): ShiftLedger {
  if (activity !== 'WORKING' && activity !== 'RESTING') throw new RangeError('Invalid shift activity.');
  return ledger.status === 'ACTIVE' ? { ...ledger, activity } : ledger;
}

export function endShift(ledger: ShiftLedger, at: string, weather: WeatherEvidence | null): ShiftLedger {
  if (ledger.status === 'ENDED') return ledger;
  const advanced = advanceShift(ledger, at, weather);
  return { ...advanced, status: 'ENDED', endedAt: advanced.lastAccountedAt };
}

export function summarizeShift(ledger: ShiftLedger): ExposureSummary {
  return summarizeExposure(ledger.segments);
}
