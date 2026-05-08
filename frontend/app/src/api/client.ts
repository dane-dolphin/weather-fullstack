import type { ApiSuccess } from './types';

export class ApiClientError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.code = code;
  }
}

export class ApiNetworkError extends Error {
  constructor(cause: unknown) {
    const msg = cause instanceof Error ? cause.message : 'Network request failed';
    super(msg);
    this.name = 'ApiNetworkError';
  }
}

const BASE_URL = (import.meta.env.VITE_API_BASE as string | undefined) ?? '';
const API_KEY = (import.meta.env.VITE_API_KEY as string | undefined) ?? '';

export async function getWeather(lat: number, lon: number): Promise<ApiSuccess> {
  const headers: Record<string, string> = {};
  if (API_KEY) headers['x-api-key'] = API_KEY;

  let response: Response;
  try {
    response = await fetch(`${BASE_URL}/weather?lat=${lat}&lon=${lon}`, { headers });
  } catch (err) {
    throw new ApiNetworkError(err);
  }

  if (!response.ok) {
    let message = response.statusText || `HTTP ${response.status}`;
    try {
      const body = (await response.json()) as { error?: unknown };
      if (typeof body.error === 'string') {
        message = body.error;
      }
    } catch {
      // body was not JSON — use statusText
    }
    throw new ApiClientError(response.status, String(response.status), message);
  }

  const data: unknown = await response.json();

  if (typeof data !== 'object' || data === null || !('weather' in data)) {
    throw new ApiClientError(200, 'INVALID_RESPONSE', 'Response missing required "weather" field');
  }

  return data as ApiSuccess;
}
