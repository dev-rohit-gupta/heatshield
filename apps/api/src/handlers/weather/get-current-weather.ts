import type { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import type { ApiError, ApiMeta, ApiSuccess, Coordinates, CurrentWeatherData } from '@heatshield/shared';
import { getCurrentWeather } from '../../services/weather.service';

type ApiResponse = {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
};

type Query = Record<string, string | undefined> | undefined;
type WeatherLoader = (location: Coordinates) => Promise<CurrentWeatherData>;

function jsonResponse(statusCode: number, body: ApiSuccess<CurrentWeatherData> | ApiError): ApiResponse {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
    body: JSON.stringify(body),
  };
}

function parseCoordinate(raw: string | undefined, min: number, max: number): number | null {
  if (raw === undefined || raw.trim() === '') return null;
  const value = Number(raw);
  return Number.isFinite(value) && value >= min && value <= max ? value : null;
}

/** Framework-independent request adapter used by Lambda and the local dev server. */
export async function handleCurrentWeather(
  query: Query,
  requestId: string,
  weatherLoader: WeatherLoader = getCurrentWeather,
): Promise<ApiResponse> {
  const meta: ApiMeta = { requestId, timestamp: new Date().toISOString() };
  const lat = parseCoordinate(query?.lat, -90, 90);
  const lng = parseCoordinate(query?.lng, -180, 180);
  if (lat === null || lng === null) {
    return jsonResponse(400, {
      success: false,
      error: {
        code: 'INVALID_COORDINATES',
        message: 'Provide valid lat (-90 to 90) and lng (-180 to 180) query parameters.',
        retryable: false,
      },
      meta,
    });
  }

  try {
    const data = await weatherLoader({ lat, lng });
    return jsonResponse(200, { success: true, data, meta });
  } catch {
    return jsonResponse(502, {
      success: false,
      error: {
        code: 'WEATHER_PROVIDER_ERROR',
        message: 'Weather information is temporarily unavailable. Please try again.',
        retryable: true,
      },
      meta,
    });
  }
}

export const handler: APIGatewayProxyHandlerV2 = async (event, context) =>
  handleCurrentWeather(event.queryStringParameters, context.awsRequestId);
