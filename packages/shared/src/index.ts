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
    provider: 'Open-Meteo' | 'HeatShield Demo';
    kind: 'MODEL_ESTIMATE' | 'DEMO_SAMPLE';
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

/** Time in the same modelled area weather. NOT a street-level or personal risk rating. */
export type RouteTimeExposure = {
  method: 'CONSTANT_AREA_HEAT_INDEX';
  estimatedOutdoorSeconds: number;
  heatIndexC: number;
  band: HeatIndexBand;
  weatherValidAt: string;
  weatherSource: 'LIVE_MODEL' | 'DEMO_SAMPLE';
};

export type RouteOption = {
  routeId: string;
  type: 'FASTEST' | 'ALTERNATIVE';
  distanceMeters: number;
  durationSeconds: number;
  geometry: { type: 'LineString'; coordinates: [number, number][] }; // GeoJSON [lng, lat]
  exposure: RouteTimeExposure | null;
};

export type RoutePlanData = {
  routeSource: 'AWS' | 'DEMO';
  origin: Coordinates;
  destination: Coordinates;
  travelMode: 'SCOOTER';
  routes: RouteOption[];
  recommendedRouteId: string | null;
  analysisStatus: 'ROUTES_ONLY' | 'SCREENED' | 'WEATHER_UNAVAILABLE' | 'OUT_OF_SCOPE';
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
