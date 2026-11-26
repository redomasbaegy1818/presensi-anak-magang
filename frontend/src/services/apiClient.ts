const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/+$/, '') || '/api/v1';

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: Record<string, string[]>;

  constructor(
    status: number,
    code: string,
    message: string,
    details?: Record<string, string[]>,
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  timeoutMs?: number;
}

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { body, headers, timeoutMs, signal: externalSignal, ...rest } = options;
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const isFormData =
    typeof FormData !== 'undefined' && body instanceof FormData;
  const effectiveTimeoutMs = timeoutMs ?? (isFormData ? 25_000 : 15_000);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), effectiveTimeoutMs);
  if (externalSignal) {
    if (externalSignal.aborted) {
      controller.abort();
    } else {
      externalSignal.addEventListener('abort', () => controller.abort(), {
        once: true,
      });
    }
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${normalizedPath}`, {
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
      signal: controller.signal,
      ...rest,
    });
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new ApiError(
        408,
        'REQUEST_TIMEOUT',
        'Permintaan melebihi batas waktu. Periksa koneksi jaringan Anda lalu coba lagi.',
      );
    }
    throw new ApiError(
      0,
      'NETWORK_ERROR',
      'Tidak dapat terhubung ke server. Periksa koneksi atau pastikan backend berjalan.',
    );
  } finally {
    clearTimeout(timeoutId);
  }

  const contentType = response.headers.get('content-type') ?? '';
  const payload = contentType.includes('application/json')
    ? await response.json().catch(() => null)
    : null;

  if (!response.ok) {
    const isProxyDown = response.status >= 502 && !payload;
    const errorCode =
      payload && typeof payload.error === 'string'
        ? payload.error
        : isProxyDown
          ? 'SERVICE_UNAVAILABLE'
          : 'REQUEST_FAILED';
    const message =
      payload && typeof payload.message === 'string'
        ? payload.message
        : isProxyDown
          ? 'Layanan server sedang tidak dapat dijangkau. Pastikan backend berjalan lalu coba lagi.'
          : 'Permintaan belum dapat diproses oleh server.';
    const details =
      payload &&
      payload.details &&
      typeof payload.details === 'object' &&
      !Array.isArray(payload.details)
        ? (payload.details as Record<string, string[]>)
        : undefined;
    throw new ApiError(response.status, errorCode, message, details);
  }

  return payload as T;
}
