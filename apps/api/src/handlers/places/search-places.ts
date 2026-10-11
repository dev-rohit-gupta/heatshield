import type { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { errorResult, ok } from '../../lib/http-response';
import { AwsLocationProvider } from '../../providers/aws-location.provider';
import { LocationService } from '../../services/location.service';
import { RequestValidationError, readSearchParams } from '../../validators/location';
import { LocationProviderError } from '../../services/location.port';

type Query = Record<string, string | undefined> | undefined;

export async function handleSearchPlaces(query: Query, requestId: string, service?: LocationService) {
  let params;
  try { params = readSearchParams(query); }
  catch (cause) {
    if (cause instanceof RequestValidationError) return errorResult(400, cause.code, cause.message, false, requestId);
    return errorResult(400, 'INVALID_REQUEST', 'Invalid search request.', false, requestId);
  }
  try {
    const useCase = service ?? new LocationService(new AwsLocationProvider());
    return ok(await useCase.search(params.q, params.near, params.limit), requestId);
  } catch (cause) {
    if (cause instanceof LocationProviderError) return errorResult(502, 'LOCATION_PROVIDER_ERROR', cause.message, true, requestId);
    return errorResult(500, 'INTERNAL_ERROR', 'Unexpected server error.', true, requestId);
  }
}

export const handler: APIGatewayProxyHandlerV2 = async (event, context) =>
  handleSearchPlaces(event.queryStringParameters, context.awsRequestId);
