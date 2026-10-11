/**
 * HeatShield exposure engine boundary.
 *
 * The scoring formula has NOT been approved or implemented yet.
 * Build this package from validated inputs and documented assumptions,
 * never from arbitrary medical-risk thresholds.
 */
export type ExposureInput = {
  temperatureC: number;
  relativeHumidityPct: number;
  observedAt: string;
  outdoorDurationSeconds: number;
};

export type ExposureAssessment = {
  modelVersion: string;
  estimatedScore: number;
  highExposureSeconds: number;
  severeExposureSeconds: number;
};
