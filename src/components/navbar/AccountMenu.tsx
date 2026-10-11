import { Alert, Button } from '@mui/material';
import { Link } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { signOut } from '../../features/auth/authSlice';

export default function AccountMenu() {
  const auth = useAppSelector((state) => state.auth);
  const dispatch = useAppDispatch();
  const signedIn = auth.session !== null;

  if (!signedIn) {
    return (
      <Button className="Nav-SignIn" component={Link} to="/sign-in" aria-label="Sign In">
        Sign In
      </Button>
    );
  }

  return (
    <>
      <Button
        className="Nav-SignIn"
        aria-label="Sign Out"
        disabled={auth.operation === 'logout'}
        onClick={() => dispatch(signOut())}
      >
        {auth.operation === 'logout' ? 'Signing Out...' : 'Sign Out'}
      </Button>
      {auth.error && <Alert severity="error">{auth.error}</Alert>}
    </>
  );
}
