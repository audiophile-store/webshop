import { useState } from 'react';
import { Alert, Button, IconButton, Menu, MenuItem, useMediaQuery } from '@mui/material';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import { Link, useLocation } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { signOut } from '../../features/auth/authSlice';

export default function AccountMenu() {
  const auth = useAppSelector((state) => state.auth);
  const dispatch = useAppDispatch();
  const signedIn = auth.session !== null;
  const location = useLocation();
  const isMobile = useMediaQuery('(max-width: 700px)');
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);

  if (!signedIn) {
    return (
      <Button className="Nav-SignIn" component={Link} to="/sign-in" aria-label="Sign In">
        Sign In
      </Button>
    );
  }

  return (
    <>
      {isMobile && location.pathname.startsWith('/admin') ? (
        <>
          <IconButton
            className="Nav-Account"
            aria-label="Account menu"
            aria-controls={anchor ? 'nav-account-menu' : undefined}
            aria-haspopup="menu"
            aria-expanded={Boolean(anchor)}
            onClick={(event) => setAnchor(event.currentTarget)}
          >
            <PersonOutlineIcon />
          </IconButton>
          <Menu
            id="nav-account-menu"
            anchorEl={anchor}
            open={Boolean(anchor)}
            onClose={() => setAnchor(null)}
          >
            <MenuItem
              disabled={auth.operation === 'logout'}
              onClick={() => {
                setAnchor(null);
                dispatch(signOut());
              }}
            >
              {auth.operation === 'logout' ? 'Signing Out...' : 'Sign Out'}
            </MenuItem>
          </Menu>
        </>
      ) : (
        <Button
          className="Nav-SignIn"
          aria-label="Sign Out"
          disabled={auth.operation === 'logout'}
          onClick={() => dispatch(signOut())}
        >
          {auth.operation === 'logout' ? 'Signing Out...' : 'Sign Out'}
        </Button>
      )}
      {auth.error && <Alert severity="error">{auth.error}</Alert>}
    </>
  );
}
