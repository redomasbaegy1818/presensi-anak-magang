const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/+$/, '') || '/api/v1';

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
}

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { body, headers, ...rest } = options;
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const isFormData =
    typeof FormData !== 'undefined' && body instanceof FormData;

  const response = await fetch(`${API_BASE_URL}${normalizedPath}`, {
    credentials: 'include',
    headers: {
      ...(isFormData || body === undefined
        ? {}
        : { 'Content-Type': 'application/json' }),
      ...headers,
    },
    body:
      body === undefined
        ? undefined
        : isFormData
          ? body
          : JSON.stringify(body),
    ...rest,
  });

  const contentType = response.headers.get('content-type') ?? '';
  const payload = contentType.includes('application/json')
    ? await response.json().catch(() => null)
    : null;

  if (!response.ok) {
    const errorCode =
      payload && typeof payload.error === 'string'
        ? payload.error
        : 'REQUEST_FAILED';
    const message =
      payload && typeof payload.message === 'string'
        ? payload.message
        : 'Permintaan belum dapat diproses oleh server.';
    throw new ApiError(response.status, errorCode, message);
  }

  return payload as T;
}
