import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { AuthApiError, getSession, login, logout } from './authApi';
import type { AuthSession, LoginRequest } from './authApi';

export interface AuthState {
  status: 'idle' | 'checking' | 'authenticated' | 'anonymous' | 'error';
  session: AuthSession | null;
  operation: 'login' | 'logout' | null;
  error: string | null;
  sessionError: string | null;
}

const initialState: AuthState = {
  status: 'idle',
  session: null,
  operation: null,
  error: null,
  sessionError: null,
};

type ThunkConfig = { state: { auth: AuthState }; rejectValue: string };
const errorMessage = (error: unknown) =>
  error instanceof AuthApiError ? error.message : 'An unexpected authentication error occurred.';

export const checkSession = createAsyncThunk<AuthSession | null, void, ThunkConfig>(
  'auth/checkSession',
  async (_, { rejectWithValue }) => {
    try {
      return await getSession();
    } catch (error) {
      return rejectWithValue(errorMessage(error));
    }
  },
  {
    condition: (_, { getState }) => {
      const auth = getState().auth;
      return auth.status !== 'checking' && auth.operation === null;
    },
  }
);

export const signIn = createAsyncThunk<AuthSession, LoginRequest, ThunkConfig>(
  'auth/signIn',
  async (credentials, { rejectWithValue }) => {
    try {
      return await login(credentials);
    } catch (error) {
      return rejectWithValue(errorMessage(error));
    }
  },
  {
    condition: (_, { getState }) => {
      const auth = getState().auth;
      return (
        auth.operation === null && !['idle', 'checking', 'authenticated'].includes(auth.status)
      );
    },
  }
);

export const signOut = createAsyncThunk<void, void, ThunkConfig>(
  'auth/signOut',
  async (_, { rejectWithValue }) => {
    try {
      await logout();
    } catch (error) {
      return rejectWithValue(errorMessage(error));
    }
  },
  {
    condition: (_, { getState }) => {
      const auth = getState().auth;
      return auth.status === 'authenticated' && auth.operation === null;
    },
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    sessionExpired: (state) => {
      if (!state.session || Date.parse(state.session.expiresAt) > Date.now()) return;
      state.session = null;
      state.status = 'anonymous';
      state.error = 'Your session has expired. Please sign in again.';
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(checkSession.pending, (state) => {
        if (!state.session) state.status = 'checking';
        state.error = null;
      })
      .addCase(checkSession.fulfilled, (state, action) => {
        state.session = action.payload;
        state.status = action.payload ? 'authenticated' : 'anonymous';
      })
      .addCase(checkSession.rejected, (state, action) => {
        state.status = 'error';
        state.session = null;
        state.error = null;
        state.sessionError = action.payload ?? 'Unable to verify your session.';
      })
      .addCase(signIn.pending, (state) => {
        state.operation = 'login';
        state.error = null;
      })
      .addCase(signIn.fulfilled, (state, action) => {
        state.operation = null;
        state.session = action.payload;
        state.status = 'authenticated';
      })
      .addCase(signIn.rejected, (state, action) => {
        state.operation = null;
        state.status = 'anonymous';
        state.session = null;
        state.error = action.payload ?? 'Unable to sign in.';
      })
      .addCase(signOut.pending, (state) => {
        state.operation = 'logout';
        state.error = null;
      })
      .addCase(signOut.fulfilled, (state) => {
        state.operation = null;
        state.status = 'anonymous';
        state.session = null;
      })
      .addCase(signOut.rejected, (state, action) => {
        state.operation = null;
        state.error = action.payload ?? 'Unable to sign out. Please try again.';
      });
  },
});

export const { sessionExpired } = authSlice.actions;
export default authSlice.reducer;
