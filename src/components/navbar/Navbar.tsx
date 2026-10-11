import * as React from 'react';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Toolbar from '@mui/material/Toolbar';
import IconButton from '@mui/material/IconButton';
import Logo from '../../assets/icons/logo.svg';
import LogoIcon from '../../assets/icons/logo-icon3.png';
import Cart from '../../assets/icons/cart.svg';
import { Link, useLocation } from 'react-router-dom';
import Button from '@mui/material/Button';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { Grid } from '@mui/material';
import './Navbar.css';
import MenuNavBar from './MenuNavBar/MenuNavBar';
import NavigationItems from './NavigationItems/NavigationItems';
import Promoted from '../Promoted/Promoted';
import { openCart } from '../../features/cart/cartSlice';
import { enqueueSnackbar } from 'notistack';
import AccountMenu from './AccountMenu';

function ResponsiveAppBar() {
  const [anchorElNav, setAnchorElNav] = React.useState<HTMLElement | null>(null);
  const [cartAnimate, setCartAnimate] = React.useState(false);
  const cartItems = useAppSelector((state) => state.cart.items);
  const cartLength = cartItems.length;
  const location = useLocation();
  const borderPathNames = ['/', '/headphones', '/speakers', '/earphones'];
  const dispatch = useAppDispatch();

  const handleOpenNavMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorElNav(event.currentTarget);
  };

  const handleCloseNavMenu = () => {
    setAnchorElNav(null);
  };

  const handleOpenCart = () => {
    if (cartLength > 0) {
      dispatch(openCart());
    } else {
      enqueueSnackbar('Your cart is empty. Add some products first!', {
        variant: 'info',
        style: { backgroundColor: '#d87d4a', color: 'white' },
        anchorOrigin: { vertical: 'bottom', horizontal: 'center' },
      });
    }
  };

  React.useEffect(() => {
    if (cartItems.length > 0) {
      setCartAnimate(true);
      const timer = setTimeout(() => {
        setCartAnimate(false);
      }, 800); // Match animation duration
      return () => clearTimeout(timer);
    }
  }, [cartItems]);

  const renderLogo = () => {
    return (
      <Link to="/">
        <IconButton style={{ padding: '0' }}>
          <img className="Logo-Image" src={Logo} alt="Audiophile" />
          <img className="Logo-Icon" src={LogoIcon} alt="Audiophile" />
        </IconButton>
      </Link>
    );
  };

  const renderPromotedProduct = () => {
    if (location.pathname === '/') {
      return <Promoted />;
    }
    return null;
  };

  const toolbarStyle = () => {
    if (borderPathNames.includes(location.pathname)) {
      return { borderBottom: '1px solid rgba(255, 255, 255, 0.2)', padding: '0' };
    }
    return { padding: '0' };
  };

  return (
    <Grid container width="100%" style={{ zIndex: 3 }}>
      <Grid item xl={12} lg={12} md={12} sm={12} className="Nav-Item-Top">
        <AppBar color="primary" position="static">
          <Box className="NavBar-Wrapper">
            <Toolbar style={toolbarStyle()}>
              <Grid container width="100%" justifyContent="space-between" alignItems="center">
                <Grid item xs="auto" className="Toolbar-Item-1">
                  <Box display="flex" alignItems="center">
                    <MenuNavBar
                      openMenuBar={handleOpenNavMenu}
                      closeMenuBar={handleCloseNavMenu}
                      anchor={anchorElNav}
                    />
                    {renderLogo()}
                  </Box>
                </Grid>
                <Grid item xs className="Toolbar-Item-2">
                  <NavigationItems calledInFooter={false} />
                </Grid>
                <Grid
                  style={
                    location.pathname === '/checkout'
                      ? { visibility: 'hidden' }
                      : { visibility: 'visible' }
                  }
                  item
                  xs="auto"
                  className="Toolbar-Item-3"
                >
                  <Box display="flex" justifyContent="flex-end" alignItems="center">
                    <AccountMenu />
                    <Button className={cartAnimate ? 'cart-bounce' : ''} onClick={handleOpenCart}>
                      {cartLength > 0 && <Box className="Nav-Cart-Quantity">{cartLength}</Box>}
                      <img src={Cart} alt="Add to Cart" />
                    </Button>
                  </Box>
                </Grid>
              </Grid>
            </Toolbar>
          </Box>
        </AppBar>
      </Grid>
      <Grid item xl={12} lg={12} md={12} sm={12} className="Nav-Item-Middle">
        {renderPromotedProduct()}
      </Grid>
      {/* <Grid item xl={ 12 } lg={ 12 } md={ 12 } sm={ 12 } className='Nav-Item-Bottom'>{ renderProductTitle() }</Grid> */}
    </Grid>
  );
}
export default ResponsiveAppBar;
