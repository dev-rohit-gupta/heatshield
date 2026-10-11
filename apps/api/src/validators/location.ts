import type { Coordinates, RoutePlanRequest } from '@heatshield/shared';

export class RequestValidationError extends Error {
  constructor(readonly code: string, message: string) { super(message); }
}

function finiteInRange(value: unknown, min: number, max: number): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;
}

export function readCoordinates(value: unknown): Coordinates {
  if (!value || typeof value !== 'object') throw new RequestValidationError('INVALID_COORDINATES', 'Both latitude and longitude are required.');
  const object = value as Record<string, unknown>;
  if (!finiteInRange(object.lat, -90, 90) || !finiteInRange(object.lng, -180, 180)) {
    throw new RequestValidationError('INVALID_COORDINATES', 'Latitude must be between -90 and 90, and longitude between -180 and 180.');
  }
  return { lat: object.lat, lng: object.lng };
}

export function readSearchParams(query: Record<string, string | undefined> | undefined) {
  const q = query?.q?.trim() ?? '';
  if (q.length < 3 || q.length > 100) throw new RequestValidationError('VALIDATION_ERROR', 'Search must be between 3 and 100 characters.');
  const rawLimit = query?.limit;
  const limit = rawLimit === undefined ? 5 : Number(rawLimit);
  if (!Number.isInteger(limit) || limit < 1 || limit > 10) throw new RequestValidationError('VALIDATION_ERROR', 'limit must be an integer between 1 and 10.');
  const hasLat = query?.lat !== undefined;
  const hasLng = query?.lng !== undefined;
  if (hasLat !== hasLng) throw new RequestValidationError('INVALID_COORDINATES', 'Provide both lat and lng, or neither.');
  if (hasLat && (!query?.lat?.trim() || !query?.lng?.trim())) {
    throw new RequestValidationError('INVALID_COORDINATES', 'Coordinates cannot be empty.');
  }
  const near = hasLat && hasLng ? readCoordinates({ lat: Number(query!.lat), lng: Number(query!.lng) }) : undefined;
  return { q, limit, near };
}

export function readRoutePlan(value: unknown): RoutePlanRequest {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new RequestValidationError('INVALID_REQUEST', 'Provide a JSON request object.');
  const object = value as Record<string, unknown>;
  const origin = readCoordinates(object.origin);
  const destination = readCoordinates(object.destination);
  if (object.travelMode !== 'SCOOTER') throw new RequestValidationError('VALIDATION_ERROR', 'Only travelMode SCOOTER is supported in V1.');
  if (Math.abs(origin.lat - destination.lat) < 1e-7 && Math.abs(origin.lng - destination.lng) < 1e-7) {
    throw new RequestValidationError('VALIDATION_ERROR', 'Origin and destination must be different.');
  }
  let departureAt: string | undefined;
  if (object.departureAt !== undefined) {
    const value = object.departureAt;
    if (typeof value !== 'string' || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?Z$/.test(value) || !Number.isFinite(Date.parse(value))) {
      throw new RequestValidationError('INVALID_TIMESTAMP', 'departureAt must be an ISO-8601 UTC timestamp.');
    }
    const millis = Date.parse(value);
    if (millis < Date.now() - 60_000 || millis > Date.now() + 7 * 86400_000) {
      throw new RequestValidationError('INVALID_TIMESTAMP', 'departureAt must be within the next seven days.');
    }
    departureAt = value;
  }
  return { origin, destination, travelMode: 'SCOOTER', ...(departureAt ? { departureAt } : {}) };
}
