import type { MouseEvent } from 'react';
import { Box, Drawer, IconButton, MenuItem } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import { pages } from '../../../app/constants';
import { useAppSelector } from '../../../app/hooks';
import { NavLink } from 'react-router-dom';
import '../Navbar.css';

interface MenuNavBarProps {
  openMenuBar: (event: MouseEvent<HTMLElement>) => void;
  closeMenuBar: () => void;
  anchor: HTMLElement | null;
}

export default function MenuNavBar({ openMenuBar, closeMenuBar, anchor }: MenuNavBarProps) {
  const isLoggedIn = useAppSelector((state) => state.auth.status === 'authenticated');
  const links = isLoggedIn ? [...pages, { title: 'Admin', url: '/admin' }] : pages;
  return (
    <Box sx={{ flexGrow: 1, display: { sm: 'flex', md: 'none' } }}>
      <IconButton size="large" onClick={openMenuBar} color="secondary">
        <MenuIcon />
      </IconButton>
      <Drawer
        open={Boolean(anchor)}
        onClose={closeMenuBar}
        PaperProps={{
          sx: {
            backgroundColor: '#fafafa',
            minWidth: '220px',
            paddingLeft: 0,
            paddingRight: 0,
          },
        }}
      >
        <Box className="MenuNavBar-Title">Audiophile</Box>
        {links.map((page) => (
          <MenuItem key={page.url} onClick={closeMenuBar} className="MenuNavBar">
            <NavLink key={page.title} to={page.url}>
              {page.title}
            </NavLink>
          </MenuItem>
        ))}
      </Drawer>
    </Box>
  );
}
