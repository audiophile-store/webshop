import { Box, Snackbar, IconButton } from '@mui/material';
import './Layout.css';
import CloseIcon from '@mui/icons-material/Close';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { closeSnackbar } from '../../features/snackbar/snackbarSlice';
import Cart from '../Cart/Cart';
import ResponsiveAppBar from '../navbar/Navbar';
import PageRoutes from '../routes/Routes';
import Footer from '../Footer/Footer';
import { useLocation } from 'react-router-dom';
import Promoted from '../Promoted/Promoted';

export default function Layout() {
  const location = useLocation();
  const isSnackbarOpened = useAppSelector((state) => state.snackbar.isOpen);
  const snackbarMessage = useAppSelector((state) => state.snackbar.message);
  const dispatch = useAppDispatch();
  const handleCloseSnackbar = () => {
    dispatch(closeSnackbar());
  };

  const action = (
    <Box>
      <IconButton size="small" aria-label="close" color="inherit" onClick={handleCloseSnackbar}>
        <CloseIcon fontSize="small" />
      </IconButton>
    </Box>
  );

  return (
    <Box className="Layout">
      <Cart />
      <Snackbar
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        open={isSnackbarOpened}
        autoHideDuration={2000}
        onClose={handleCloseSnackbar}
        message={snackbarMessage}
        action={action}
      />
      <Box component="header" className="Layout-Header">
        <ResponsiveAppBar />
      </Box>
      <Box component="main" className="Layout-Main">
        {location.pathname === '/' && (
          <Box className="Nav-Item-Middle">
            <Promoted />
          </Box>
        )}
        <PageRoutes />
      </Box>
      <Box className="Layout-Footer">
        <Footer />
      </Box>
    </Box>
  );
}
