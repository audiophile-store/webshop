export interface AuthSession {
  user: { id: string; email: string; role: 'admin' };
  expiresAt: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export class AuthApiError extends Error {
  constructor(
    message: string,
    public readonly status?: number
  ) {
    super(message);
    this.name = 'AuthApiError';
  }
}

const HTTP_ERRORS: Record<number, string> = {
  400: 'Invalid login details. Check your email and password.',
  401: 'Invalid email or password.',
  403: 'This frontend origin is not allowed by the auth service. Contact the administrator.',
  429: 'Too many login attempts. Please wait before trying again.',
  500: 'The auth service encountered an error. Please try later.',
  503: 'The auth service is unavailable. Please try later.',
};

export function isAuthSession(value: unknown): value is AuthSession {
  if (
    typeof value !== 'object' ||
    value === null ||
    !('user' in value) ||
    !('expiresAt' in value)
  ) {
    return false;
  }
  const user = value.user;
  return (
    typeof user === 'object' &&
    user !== null &&
    'id' in user &&
    typeof user.id === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(user.id) &&
    'email' in user &&
    typeof user.email === 'string' &&
    !!user.email.trim() &&
    'role' in user &&
    user.role === 'admin' &&
    typeof value.expiresAt === 'string' &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value.expiresAt) &&
    Date.parse(value.expiresAt) > Date.now()
  );
}

async function request(
  path: string,
  method: 'GET' | 'POST',
  body?: LoginRequest
): Promise<Response> {
  try {
    return await fetch(`/api/auth${path}`, {
      method,
      credentials: 'include',
      cache: 'no-store',
      ...(body
        ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
        : {}),
    });
  } catch {
    throw new AuthApiError(
      'Unable to reach the auth service. Check your connection and auth proxy.'
    );
  }
}

function checkStatus(response: Response, expected: number) {
  if (response.status !== expected) {
    throw new AuthApiError(
      HTTP_ERRORS[response.status] ?? `Unexpected auth response (HTTP ${response.status}).`,
      response.status
    );
  }
}

async function readSession(response: Response): Promise<AuthSession> {
  checkStatus(response, 200);
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new AuthApiError('The auth service returned an invalid session response.');
  }
  if (!isAuthSession(body)) {
    throw new AuthApiError('The auth service returned an invalid or expired session.');
  }
  return body;
}

export async function login(requestBody: LoginRequest): Promise<AuthSession> {
  return readSession(
    await request('/login', 'POST', {
      email: requestBody.email.trim().toLowerCase(),
      password: requestBody.password,
    })
  );
}

export async function getSession(): Promise<AuthSession | null> {
  const response = await request('/me', 'GET');
  if (response.status === 401) return null;
  return readSession(response);
}

export async function logout(): Promise<void> {
  checkStatus(await request('/logout', 'POST'), 204);
}
