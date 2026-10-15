import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: { proxy: { '/api': 'https://ordarly-server.onrender.com' } },
  build: {
    target: 'es2020', // PERF (new): modern output is smaller than transpiling for very old browsers
  },
});
