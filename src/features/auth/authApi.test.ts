import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getSession, isAuthSession, login, logout } from './authApi';

const fetchMock = vi.fn<typeof fetch>();
const session = () => ({
  user: { id: 'c7428fe9-a8b6-4ec4-ab48-93e8bfa86a0b', email: 'admin@example.com', role: 'admin' },
  expiresAt: new Date(Date.now() + 3600000).toISOString(),
});

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

describe('auth API contract', () => {
  it('sends normalized email and unchanged password, with same-origin cookies and no cache', async () => {
    const response = session();
    fetchMock.mockResolvedValue(new Response(JSON.stringify(response)));
    await expect(
      login({ email: ' ADMIN@Example.com ', password: ' Space Password! ' })
    ).resolves.toEqual(response);
    expect(fetchMock).toHaveBeenCalledExactlyOnceWith('/api/auth/login', {
      method: 'POST',
      credentials: 'include',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@example.com', password: ' Space Password! ' }),
    });
  });

  it('treats only /me HTTP 401 as an anonymous session', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 401 }));
    await expect(getSession()).resolves.toBeNull();
    expect(fetchMock).toHaveBeenCalledWith('/api/auth/me', {
      method: 'GET',
      credentials: 'include',
      cache: 'no-store',
    });
    await expect(login({ email: 'admin@example.com', password: 'wrong' })).rejects.toThrow(
      'Invalid email or password'
    );
  });

  it.each([400, 403, 429, 500, 503, 404, 302])(
    'surfaces HTTP %s without retrying',
    async (status) => {
      fetchMock.mockResolvedValue(new Response(null, { status }));
      await expect(getSession()).rejects.toMatchObject({ status });
      expect(fetchMock).toHaveBeenCalledTimes(1);
    }
  );

  it.each([
    null,
    {},
    { ...session(), expiresAt: 'invalid' },
    { ...session(), expiresAt: new Date(Date.now() - 1).toISOString() },
    { ...session(), user: { ...session().user, role: 'user' } },
    { ...session(), user: { ...session().user, id: '' } },
  ])('rejects malformed, non-admin or expired identities', async (body) => {
    expect(isAuthSession(body)).toBe(false);
    fetchMock.mockResolvedValue(new Response(JSON.stringify(body)));
    await expect(getSession()).rejects.toThrow('invalid or expired session');
  });

  it('reports invalid JSON and network failures explicitly', async () => {
    fetchMock.mockResolvedValueOnce(new Response('<html>not JSON</html>'));
    await expect(getSession()).rejects.toThrow('invalid session response');
    fetchMock.mockRejectedValueOnce(new TypeError('Network error'));
    await expect(getSession()).rejects.toThrow('Unable to reach');
  });

  it('accepts only HTTP 204 for logout and never sends credentials in the body', async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));
    await expect(logout()).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledWith('/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
      cache: 'no-store',
    });
    fetchMock.mockResolvedValueOnce(new Response('{}', { status: 200 }));
    await expect(logout()).rejects.toThrow('Unexpected auth response');
  });
});
