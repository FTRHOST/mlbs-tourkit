import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      host: true, // Listen on all interfaces (0.0.0.0)
      port: 5173, // Standard Vite Port
      proxy: {
        '/api': {
          target: 'http://localhost:3000',
          changeOrigin: true
        },
        '/upload': {
          target: 'http://localhost:3000',
          changeOrigin: true
        },
        '/socket.io': {
          target: 'http://localhost:3000',
          ws: true
        }
      }
    },
    plugins: [react()],
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});