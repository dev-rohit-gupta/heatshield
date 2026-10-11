import type { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import type { ApiSuccess } from '@heatshield/shared';

/** No AWS services are called by this lightweight health response. */
export const handler: APIGatewayProxyHandlerV2 = async (event, context) => {
  const body: ApiSuccess<{ status: 'ok'; version: string }> = {
    success: true,
    data: { status: 'ok', version: '0.1.0' },
    meta: { requestId: context.awsRequestId, timestamp: new Date().toISOString() },
  };

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    body: JSON.stringify(body),
  };
};
