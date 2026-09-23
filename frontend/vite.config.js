import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The frontend talks to the API via VITE_API_URL (see .env). During dev you
// can also rely on the proxy below so requests to /api hit the backend.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:4000',
    },
  },
});
