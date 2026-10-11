import type { ApiSuccess } from '@heatshield/shared';

export class ApiClientError extends Error {
  constructor(message: string, readonly code = 'NETWORK_ERROR', readonly retryable = true) {
    super(message);
  }
}

/** Reusable, typed HTTP transport. AWS/provider credentials never reach the app. */
export async function apiRequest<T>(path: string, options: { method?: 'GET' | 'POST'; body?: unknown; signal?: AbortSignal } = {}): Promise<T> {
  const base = process.env.EXPO_PUBLIC_API_BASE_URL?.replace(/\/$/, '');
  if (!base) throw new ApiClientError('Set EXPO_PUBLIC_API_BASE_URL in apps/mobile/.env and restart Expo.', 'CONFIG_MISSING', false);
  const controller = new AbortController();
  const abort = () => controller.abort();
  options.signal?.addEventListener('abort', abort, { once: true });
  const timer = setTimeout(abort, 12_000);
  try {
    if (options.signal?.aborted) controller.abort();
    const response = await fetch(`${base}${path}`, {
      method: options.method || 'GET',
      ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
      headers: { Accept: 'application/json', ...(options.body === undefined ? {} : { 'Content-Type': 'application/json' }) },
      signal: controller.signal,
    });
    const json: unknown = await response.json();
    if (!json || typeof json !== 'object' || !('success' in json)) throw new ApiClientError('Invalid API response.', 'INVALID_RESPONSE', true);
    if (json.success === false) {
      const failure = (json as { error?: { code?: string; message?: string; retryable?: boolean } }).error;
      throw new ApiClientError(failure?.message || 'Request failed.', failure?.code, failure?.retryable ?? false);
    }
    if (!response.ok || json.success !== true || !('data' in json)) throw new ApiClientError('Request failed.', 'INVALID_RESPONSE', true);
    return (json as ApiSuccess<T>).data;
  } catch (err) {
    if (err instanceof ApiClientError) throw err;
    if (controller.signal.aborted) throw new ApiClientError('Request cancelled or timed out.', 'REQUEST_ABORTED', true);
    throw new ApiClientError('Cannot reach HeatShield API. Check server and network.');
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener('abort', abort);
  }
}
