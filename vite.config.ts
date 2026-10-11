import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => ({
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
    proxy: {
      '/api/auth': {
        target: loadEnv(mode, process.cwd(), '').AUTH_PROXY_TARGET || 'http://localhost:3002',
        changeOrigin: false,
        rewrite: (path) => path.replace(/^\/api\/auth/, ''),
      },
    },
  },
  build: {
    outDir: 'dist',
  },
}));
