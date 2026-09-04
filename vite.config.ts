import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // Listen on all local IP addresses (0.0.0.0 / localhost)
    port: 5173, // Default Vite port (can be overridden via CLI with --port <number>)
    open: false,
    proxy: {
      '/api': 'http://localhost:8000',
    },
  }
});
