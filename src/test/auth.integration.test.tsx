import { configureStore } from '@reduxjs/toolkit';
import { StrictMode } from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import authReducer, { checkSession, signIn } from '../features/auth/authSlice';
import AuthSession from '../features/auth/AuthSession';
import ProtectedRoute from '../components/routes/ProtectedRoute';
import AccountMenu from '../components/navbar/AccountMenu';
import SignIn from '../pages/Auth/SignIn';

const fetchMock = vi.fn<typeof fetch>();
const session = () => ({
  user: { id: 'c7428fe9-a8b6-4ec4-ab48-93e8bfa86a0b', email: 'admin@example.com', role: 'admin' },
  expiresAt: new Date(Date.now() + 3600000).toISOString(),
});
const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

function renderAuth(path = '/admin') {
  const store = configureStore({ reducer: { auth: authReducer } });
  render(
    <StrictMode>
      <Provider store={store}>
        <MemoryRouter initialEntries={[path]}>
          <AuthSession />
          <AccountMenu />
          <Routes>
            <Route
              path="/admin"
              element={
                <ProtectedRoute>
                  <h1>Admin content</h1>
                </ProtectedRoute>
              }
            />
            <Route path="/sign-in" element={<SignIn />} />
          </Routes>
        </MemoryRouter>
      </Provider>
    </StrictMode>
  );
  return store;
}

function fillLogin() {
  fireEvent.change(screen.getByRole('textbox', { name: 'Email' }), {
    target: { value: 'ADMIN@example.com' },
  });
  fireEvent.change(screen.getByLabelText(/^Password/), { target: { value: 'Password123!' } });
}

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
  vi.stubEnv('VITE_AUTH_API_URL', 'https://auth.example.test');
});

afterEach(() => vi.useRealTimers());

describe('authentication UI', () => {
  it('offers sign-in directly even when the background session check fails', async () => {
    fetchMock.mockResolvedValueOnce(response({}, 404));
    renderAuth();
    fireEvent.click(await screen.findByRole('link', { name: 'Sign In' }));
    expect(screen.getByRole('heading', { name: 'Sign In' })).toBeVisible();
    expect(screen.getByRole('textbox', { name: 'Email' })).toBeEnabled();
    expect(screen.getByLabelText(/^Password/)).toBeEnabled();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /sign up|create account/i })).not.toBeInTheDocument();
  });

  it('waits for one startup session check in StrictMode and restores the admin session', async () => {
    let resolve!: (value: Response) => void;
    fetchMock.mockReturnValue(
      new Promise((done) => {
        resolve = done;
      })
    );
    const store = renderAuth();
    expect(screen.getByRole('progressbar', { name: 'Checking session' })).toBeVisible();
    expect(screen.queryByText('Admin content')).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await act(async () => resolve(response(session())));
    expect(screen.getByText('Admin content')).toBeVisible();
    expect(store.getState().auth.status).toBe('authenticated');
  });

  it('redirects anonymous users, locks login, then returns to the protected route', async () => {
    fetchMock.mockResolvedValueOnce(response({ code: 'INVALID_SESSION' }, 401));
    const store = renderAuth();
    await screen.findByRole('heading', { name: 'Sign In' });
    await waitFor(() => expect(screen.getByLabelText(/^Password/)).toBeEnabled());
    fillLogin();
    let resolve!: (value: Response) => void;
    fetchMock.mockReturnValueOnce(
      new Promise((done) => {
        resolve = done;
      })
    );
    fireEvent.click(screen.getByRole('button', { name: 'Sign In' }));
    expect(screen.getByRole('button', { name: /Please wait/ })).toBeDisabled();
    await store.dispatch(signIn({ email: 'admin@example.com', password: 'duplicate' }));
    expect(fetchMock).toHaveBeenCalledTimes(2);
    await act(async () => resolve(response(session())));
    expect(screen.getByText('Admin content')).toBeVisible();
    expect(store.getState().auth.session?.user.email).toBe('admin@example.com');
    expect(screen.queryByLabelText(/^Password/)).not.toBeInTheDocument();
  });

  it('displays rejected credentials and allows a manual retry', async () => {
    fetchMock.mockResolvedValueOnce(response({}, 401));
    renderAuth('/sign-in');
    await waitFor(() => expect(screen.getByLabelText(/^Password/)).toBeEnabled());
    fillLogin();
    fetchMock.mockResolvedValueOnce(response({}, 401));
    fireEvent.click(screen.getByRole('button', { name: 'Sign In' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid email or password');
    expect(screen.getByRole('button', { name: 'Sign In' })).toBeEnabled();
    expect(screen.getByLabelText(/^Password/)).toHaveValue('Password123!');
  });

  it('does not expose admin content or disguise a service error as a logged-out session', async () => {
    fetchMock.mockResolvedValueOnce(response({}, 503));
    renderAuth();
    expect(await screen.findByRole('link', { name: 'Sign In' })).toBeVisible();
    expect(screen.queryByText('Admin content')).not.toBeInTheDocument();
    fetchMock.mockResolvedValueOnce(response(session()));
    fireEvent(window, new Event('focus'));
    expect(await screen.findByText('Admin content')).toBeVisible();
  });

  it('rechecks on focus and revokes local access when the backend session is missing', async () => {
    fetchMock.mockResolvedValueOnce(response(session()));
    renderAuth();
    await screen.findByText('Admin content');
    fetchMock.mockResolvedValueOnce(response({}, 401));
    fireEvent(window, new Event('focus'));
    expect(await screen.findByRole('heading', { name: 'Sign In' })).toBeVisible();
    expect(screen.queryByText('Admin content')).not.toBeInTheDocument();
  });

  it('clears local access at expiry without waiting for a backend request', async () => {
    vi.useFakeTimers();
    const data = { ...session(), expiresAt: new Date(Date.now() + 1000).toISOString() };
    fetchMock.mockResolvedValueOnce(response(data));
    const store = renderAuth();
    await act(async () => {});
    expect(screen.getByText('Admin content')).toBeVisible();
    await act(async () => vi.advanceTimersByTime(1000));
    expect(store.getState().auth.session).toBeNull();
    expect(screen.getByRole('heading', { name: 'Sign In' })).toBeVisible();
    expect(screen.getByRole('alert')).toHaveTextContent('session has expired');
  });

  it('keeps the session and shows logout failure, then clears it only after a confirmed logout', async () => {
    fetchMock.mockResolvedValueOnce(response(session()));
    const store = renderAuth();
    await screen.findByText('Admin content');
    fetchMock.mockResolvedValueOnce(response({}, 503));
    fireEvent.click(screen.getByRole('button', { name: 'Sign Out' }));
    expect(
      await screen.findByText((value) => value.includes('auth service is unavailable'))
    ).toBeVisible();
    expect(store.getState().auth.status).toBe('authenticated');
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));
    fireEvent.click(screen.getByRole('button', { name: 'Sign Out' }));
    await screen.findByRole('heading', { name: 'Sign In' });
    expect(store.getState().auth.session).toBeNull();
  });

  it('does not expose account creation or call a nonexistent registration API', async () => {
    fetchMock.mockResolvedValueOnce(response({}, 401));
    const store = renderAuth();
    await waitFor(() => expect(store.getState().auth.status).toBe('anonymous'));
    expect(screen.queryByRole('link', { name: /sign up|create account/i })).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledExactlyOnceWith(
      'https://auth.example.test/me',
      expect.any(Object)
    );
    fireEvent.click(screen.getByRole('link', { name: 'Sign In' }));
    expect(screen.getByRole('heading', { name: 'Sign In' })).toBeVisible();
  });

  it('keeps labels above browser-filled values and submits those values', async () => {
    fetchMock.mockResolvedValueOnce(response({}, 401));
    renderAuth('/sign-in');
    const email = await screen.findByRole('textbox', { name: 'Email' });
    const password = screen.getByLabelText(/^Password/);
    expect(
      email.closest('.MuiFormControl-root')?.querySelector('.MuiInputLabel-shrink')
    ).not.toBeNull();
    expect(
      password.closest('.MuiFormControl-root')?.querySelector('.MuiInputLabel-shrink')
    ).not.toBeNull();
    fireEvent.change(email, { target: { value: 'test@test.com' } });
    fireEvent.change(password, { target: { value: 'Password123!' } });
    fetchMock.mockResolvedValueOnce(response({}, 401));
    fireEvent.click(screen.getByRole('button', { name: 'Sign In' }));
    await screen.findByRole('alert');
    expect(fetchMock).toHaveBeenLastCalledWith(
      'https://auth.example.test/login',
      expect.objectContaining({
        body: JSON.stringify({ email: 'test@test.com', password: 'Password123!' }),
      })
    );
  });

  it('does not issue concurrent session checks', async () => {
    const store = configureStore({ reducer: { auth: authReducer } });
    let resolve!: (value: Response) => void;
    fetchMock.mockReturnValue(
      new Promise((done) => {
        resolve = done;
      })
    );
    const first = store.dispatch(checkSession());
    await store.dispatch(checkSession());
    expect(fetchMock).toHaveBeenCalledTimes(1);
    resolve(response({}, 401));
    await first;
    expect(store.getState().auth.status).toBe('anonymous');
  });
});
