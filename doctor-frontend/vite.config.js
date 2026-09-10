import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174 // patient-mobile / patient-frontend likely use 5173, keep doctor portal separate
  }
});
