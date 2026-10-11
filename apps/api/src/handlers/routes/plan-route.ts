import type { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { errorResult, ok } from '../../lib/http-response';
import { AwsLocationProvider } from '../../providers/aws-location.provider';
import { LocationService } from '../../services/location.service';
import { LocationProviderError, RouteUnavailableError } from '../../services/location.port';
import { RequestValidationError, readRoutePlan } from '../../validators/location';

export async function handlePlanRoute(input: unknown, requestId: string, service?: LocationService) {
  let plan;
  try { plan = readRoutePlan(input); }
  catch (cause) {
    if (cause instanceof RequestValidationError) return errorResult(400, cause.code, cause.message, false, requestId);
    return errorResult(400, 'INVALID_REQUEST', 'Invalid route planning request.', false, requestId);
  }
  try {
    const useCase = service ?? new LocationService(new AwsLocationProvider());
    return ok(await useCase.plan(plan.origin, plan.destination, plan.departureAt), requestId);
  } catch (cause) {
    if (cause instanceof RouteUnavailableError) return errorResult(422, 'ROUTE_NOT_AVAILABLE', cause.message, false, requestId);
    if (cause instanceof LocationProviderError) return errorResult(502, 'LOCATION_PROVIDER_ERROR', cause.message, true, requestId);
    return errorResult(500, 'INTERNAL_ERROR', 'Unexpected server error.', true, requestId);
  }
}

export const handler: APIGatewayProxyHandlerV2 = async (event, context) => {
  let input: unknown;
  try { input = event.body ? JSON.parse(event.body) : null; }
  catch { return errorResult(400, 'INVALID_REQUEST', 'Invalid JSON request body.', false, context.awsRequestId); }
  return handlePlanRoute(input, context.awsRequestId);
};
