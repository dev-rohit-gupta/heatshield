import { screenHeatIndex, type HeatIndexBand } from './heat-index';

export type ExposureEnvironment = 'OUTDOORS' | 'INDOORS' | 'UNKNOWN';

export type ExposureSegmentInput = {
  durationSeconds: number;
  environment: ExposureEnvironment;
  temperatureC?: number;
  relativeHumidityPct?: number;
};

export type ExposureSegment = {
  durationSeconds: number;
  environment: ExposureEnvironment;
  band: HeatIndexBand | null;
};

export type ExposureSummary = {
  totalSeconds: number;
  screenedOutdoorSeconds: number;
  indoorSeconds: number;
  unassessedSeconds: number;
  byBandSeconds: Record<HeatIndexBand, number>;
};

/** Evaluate only known OUTDOOR time. Indoor/unknown weather exposure is not assumed. */
export function evaluateExposureSegment(input: ExposureSegmentInput): ExposureSegment {
  const { durationSeconds, environment } = input;
  if (!Number.isInteger(durationSeconds) || durationSeconds < 0 || durationSeconds > 86_400) {
    throw new RangeError('durationSeconds must be a whole number from 0 to 86400.');
  }
  if (!['OUTDOORS', 'INDOORS', 'UNKNOWN'].includes(environment)) {
    throw new RangeError('Unsupported environment.');
  }
  if (environment !== 'OUTDOORS') return { durationSeconds, environment, band: null };
  if (input.temperatureC === undefined || input.relativeHumidityPct === undefined) {
    return { durationSeconds, environment, band: null };
  }
  return {
    durationSeconds,
    environment,
    band: screenHeatIndex(input.temperatureC, input.relativeHumidityPct).band,
  };
}

/** Pure and associative: summaries may be merged without double counting segments. */
export function summarizeExposure(segments: readonly ExposureSegment[]): ExposureSummary {
  const summary: ExposureSummary = {
    totalSeconds: 0,
    screenedOutdoorSeconds: 0,
    indoorSeconds: 0,
    unassessedSeconds: 0,
    byBandSeconds: {
      BELOW_CAUTION: 0,
      CAUTION: 0,
      EXTREME_CAUTION: 0,
      DANGER: 0,
      EXTREME_DANGER: 0,
    },
  };
  for (const segment of segments) {
    if (!Number.isInteger(segment.durationSeconds) || segment.durationSeconds < 0) {
      throw new RangeError('Invalid exposure segment duration.');
    }
    summary.totalSeconds += segment.durationSeconds;
    if (segment.environment === 'INDOORS') summary.indoorSeconds += segment.durationSeconds;
    else if (segment.environment === 'OUTDOORS' && segment.band !== null) {
      summary.screenedOutdoorSeconds += segment.durationSeconds;
      summary.byBandSeconds[segment.band] += segment.durationSeconds;
    } else summary.unassessedSeconds += segment.durationSeconds;
  }
  return summary;
}
