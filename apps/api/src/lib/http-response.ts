import type { ApiError, ApiMeta, ApiSuccess } from '@heatshield/shared';

export type HttpResult = { statusCode: number; headers: Record<string, string>; body: string };

function meta(requestId: string): ApiMeta { return { requestId, timestamp: new Date().toISOString() }; }

function json(statusCode: number, value: unknown): HttpResult {
  return { statusCode, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }, body: JSON.stringify(value) };
}

export function ok<T>(data: T, requestId: string): HttpResult {
  const result: ApiSuccess<T> = { success: true, data, meta: meta(requestId) };
  return json(200, result);
}

export function errorResult(statusCode: number, code: string, message: string, retryable: boolean, requestId: string): HttpResult {
  const result: ApiError = { success: false, error: { code, message, retryable }, meta: meta(requestId) };
  return json(statusCode, result);
}
