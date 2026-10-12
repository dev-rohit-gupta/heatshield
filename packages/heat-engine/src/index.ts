export {
  calculateHeatIndexC,
  classifyHeatIndexC,
  screenHeatIndex,
  type HeatIndexBand,
  type HeatIndexScreening,
} from './heat-index';
export {
  evaluateExposureSegment,
  summarizeExposure,
  type ExposureEnvironment,
  type ExposureSegment,
  type ExposureSegmentInput,
  type ExposureSummary,
} from './exposure';
export {
  compareRouteOutdoorTime,
  type RouteDuration,
  type RouteTimeComparison,
  type RouteTimeScreening,
} from './route-screening';
export {
  advanceShift,
  changeShiftEnvironment,
  changeShiftActivity,
  endShift,
  startShift,
  summarizeShift,
  verifiedWeather,
  MAX_CONTINUOUS_INTERVAL_SECONDS,
  MAX_WEATHER_AGE_MS,
  type ShiftLedger,
  type WeatherEvidence,
} from './shift-tracker';

export { completedShiftEvent, enqueueCompletedShift, acknowledgeShiftEvents, type ShiftSyncEvent } from './shift-sync';
