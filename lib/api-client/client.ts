export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

export class ApiClientError extends Error {
  readonly code: string;
  readonly statusCode: number;
  readonly details?: Record<string, unknown>;

  constructor(message: string, code: string, statusCode: number, details?: Record<string, unknown>) {
    super(message);
    this.name = 'ApiClientError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.API_BASE_URL ||
  'http://localhost:3000/v1';

export interface RequestOptions extends RequestInit {
  token?: string;
}

/**
 * Core fetch wrapper that communicates with the Campaign Integrity REST API.
 * Unwraps standard API error responses according to OAS §3.
 */
export async function apiClient<T = unknown>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { token, headers: customHeaders, ...restOptions } = options;

  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  const cleanBaseUrl = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
  const url = endpoint.startsWith('http://') || endpoint.startsWith('https://')
    ? endpoint
    : `${cleanBaseUrl}/${cleanEndpoint}`;

  const headers = new Headers(customHeaders);

  if (!headers.has('Content-Type') && restOptions.body && typeof restOptions.body === 'string') {
    headers.set('Content-Type', 'application/json');
  }

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(url, {
    ...restOptions,
    headers,
  });

  if (!response.ok) {
    let errorData: ApiErrorResponse | null = null;
    try {
      errorData = await response.json();
    } catch {
      // Body is not JSON
    }

    const message = errorData?.error?.message || `Request failed with status ${response.status}`;
    const code = errorData?.error?.code || 'UNKNOWN_ERROR';
    const details = errorData?.error?.details;

    throw new ApiClientError(message, code, response.status, details);
  }

  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}
