import { Alert, Box, Button, CircularProgress } from '@mui/material';
import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { checkSession } from '../../features/auth/authSlice';

export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const auth = useAppSelector((state) => state.auth);
  const dispatch = useAppDispatch();
  const location = useLocation();

  if (auth.status === 'idle' || auth.status === 'checking') {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <CircularProgress aria-label="Checking session" />
      </Box>
    );
  }
  if (auth.status === 'error') {
    return (
      <Box sx={{ p: 4 }}>
        <Alert severity="error">{auth.error}</Alert>
        <Button onClick={() => dispatch(checkSession())}>Retry session check</Button>
      </Box>
    );
  }
  if (
    auth.status !== 'authenticated' ||
    !auth.session ||
    Date.parse(auth.session.expiresAt) <= Date.now()
  ) {
    return (
      <Navigate
        to="/sign-in"
        state={{ from: location.pathname + location.search + location.hash }}
        replace
      />
    );
  }
  if (auth.session.user.role !== 'admin') return <Navigate to="/" replace />;
  return children;
}
