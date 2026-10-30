import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base './' keeps the built site relocatable; routing uses the URL hash so any static server works.
export default defineConfig({
  base: './',
  plugins: [react()],
  server: { port: 5173, open: false },
});
