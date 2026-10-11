import { Alert, Box, Button, CircularProgress, TextField, Typography } from '@mui/material';
import type { FormEvent } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { signIn } from '../../features/auth/authSlice';
import './Auth.css';

function returnPath(state: unknown): string {
  if (
    typeof state !== 'object' ||
    state === null ||
    !('from' in state) ||
    typeof state.from !== 'string'
  ) {
    return '/admin';
  }
  const path = state.from;
  return path.startsWith('/') &&
    !path.startsWith('//') &&
    !path.includes('\\') &&
    !/^\/sign-in([/?#]|$)/.test(path)
    ? path
    : '/admin';
}

export default function SignIn() {
  const auth = useAppSelector((state) => state.auth);
  const dispatch = useAppDispatch();
  const location = useLocation();
  const busy = auth.operation === 'login';

  if (
    auth.status === 'authenticated' &&
    auth.session &&
    Date.parse(auth.session.expiresAt) > Date.now()
  ) {
    return <Navigate to={returnPath(location.state)} replace />;
  }

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    const data = new FormData(event.currentTarget);
    const email = String(data.get('email') ?? '').trim();
    const password = String(data.get('password') ?? '');
    if (!email || !password || Array.from(password).length > 128) return;
    void dispatch(signIn({ email, password }));
  };

  return (
    <Box className="Auth">
      <Box className="Auth-Card">
        <Typography variant="h5" component="h1">
          Sign In
        </Typography>
        <Typography className="Auth-Subtitle">Sign in with your administrator account.</Typography>
        <Box component="form" className="Auth-Form" onSubmit={submit}>
          <TextField
            label="Email"
            name="email"
            type="email"
            autoComplete="username"
            required
            fullWidth
            disabled={busy}
            InputLabelProps={{ shrink: true }}
            inputProps={{ maxLength: 254 }}
          />
          <TextField
            label="Password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            fullWidth
            disabled={busy}
            InputLabelProps={{ shrink: true }}
            inputProps={{ maxLength: 256 }}
          />
          {auth.error && <Alert severity="error">{auth.error}</Alert>}
          <Button type="submit" variant="contained" className="Auth-Submit" disabled={busy}>
            {busy ? (
              <>
                <CircularProgress size={18} color="inherit" /> Please wait...
              </>
            ) : (
              'Sign In'
            )}
          </Button>
        </Box>
      </Box>
    </Box>
  );
}
