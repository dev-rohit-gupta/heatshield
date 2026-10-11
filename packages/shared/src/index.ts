/** API contracts shared by the Expo client and Lambda handlers. */
export type Coordinates = { lat: number; lng: number };

export type RiskLevel = 'LOW' | 'MODERATE' | 'HIGH' | 'SEVERE';

export type ApiMeta = {
  requestId: string;
  timestamp: string;
};

export type ApiSuccess<T> = {
  success: true;
  data: T;
  meta: ApiMeta;
};

export type ApiError = {
  success: false;
  error: {
    code: string;
    message: string;
    retryable: boolean;
    details?: unknown;
  };
  meta: ApiMeta;
};

/** Current conditions from an external weather model. No safety score is implied. */
export type CurrentWeatherData = {
  location: Coordinates;
  validAt: string;
  source: {
    provider: 'Open-Meteo';
    kind: 'MODEL_ESTIMATE';
  };
  weather: {
    temperatureC: number;
    apparentTemperatureC: number;
    relativeHumidityPct: number;
    windSpeedKph: number | null;
    uvIndex: number | null;
    solarRadiationWm2: number | null;
    isDay: boolean | null;
  };
};

/** Stable, vendor-independent models for destination search and routing. */
export type PlaceResult = {
  placeId: string;
  name: string;
  address: string;
  location: Coordinates;
};

export type SearchPlacesData = { places: PlaceResult[] };

export type RoutePlanRequest = {
  origin: Coordinates;
  destination: Coordinates;
  travelMode: 'SCOOTER';
  departureAt?: string;
};

export type RouteOption = {
  routeId: string;
  type: 'FASTEST' | 'ALTERNATIVE';
  distanceMeters: number;
  durationSeconds: number;
  geometry: { type: 'LineString'; coordinates: [number, number][] }; // GeoJSON [lng, lat]
  exposure: null; // Not calculated until the heat engine is implemented and verified.
};

export type RoutePlanData = {
  origin: Coordinates;
  destination: Coordinates;
  travelMode: 'SCOOTER';
  routes: RouteOption[];
  recommendedRouteId: null;
  analysisStatus: 'ROUTES_ONLY';
  notice: string;
};

/** NWS screening labels. This is an environmental estimate, not a medical diagnosis. */
export type HeatIndexBand =
  | 'BELOW_CAUTION'
  | 'CAUTION'
  | 'EXTREME_CAUTION'
  | 'DANGER'
  | 'EXTREME_DANGER';

export type HeatIndexScreening = {
  modelVersion: 'nws-heat-index-v1';
  heatIndexC: number;
  band: HeatIndexBand;
  message: string;
  limitation: string;
};

export type ScreenedWeatherData = CurrentWeatherData & {
  heatScreening: HeatIndexScreening;
};
