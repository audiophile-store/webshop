import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(() => ({
  plugins: [react()],
  optimizeDeps: {
    include: [
      '@mui/material',
      '@mui/material/styles',
      '@mui/icons-material/Inventory2Outlined',
      '@mui/icons-material/SearchOffOutlined',
      '@mui/icons-material/Refresh',
      '@mui/icons-material/ArrowForward',
      '@mui/icons-material/PersonOutline',
    ],
  },
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
  },
  build: {
    outDir: 'dist',
  },
}));
