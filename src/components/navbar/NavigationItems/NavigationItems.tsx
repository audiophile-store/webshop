import { Box } from '@mui/material';
import { NavLink } from 'react-router-dom';
import { pages } from '../../../app/constants';
import { useAppSelector } from '../../../app/hooks';
import './NavigationItems.css';

export default function NavigationItems({ calledInFooter }: { calledInFooter?: boolean }) {
  const isLoggedIn = useAppSelector((state) => state.auth.status === 'authenticated');
  const links = isLoggedIn ? [...pages, { title: 'Admin', url: '/admin' }] : pages;

  return (
    <Box display="flex" justifyContent="space-between" alignItems="center">
      <Box
        className="Nav-Items"
        sx={{
          flexGrow: 1,
          gap: 2,
          display: { xs: `${calledInFooter ? 'flex' : 'none'}`, md: 'flex' },
          flexDirection: { xs: `${calledInFooter ? 'column' : 'row'}`, sm: 'row' },
          justifyContent: { xs: 'center', sm: `${!calledInFooter ? 'center' : 'flex-end'}` },
          alignItems: 'center',
        }}
      >
        {links.map((page) => (
          <NavLink key={page.title} to={page.url} className="Link">
            {page.title}
          </NavLink>
        ))}
      </Box>
    </Box>
  );
}
