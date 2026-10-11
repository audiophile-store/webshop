import { Box } from '@mui/material';
import { useEffect } from 'react';
import './App.css';
import Layout from './components/Layout/Layout';
import { useAppDispatch } from './app/hooks';
import { fetchProducts } from './features/product/productSlice';
import AuthSession from './features/auth/AuthSession';

function App() {
  const dispatch = useAppDispatch();
  useEffect(() => {
    dispatch(fetchProducts());
  }, [dispatch]);

  return (
    <Box className="App">
      <AuthSession />
      <Layout />
    </Box>
  );
}

export default App;
