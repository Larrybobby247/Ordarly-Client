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
    rollupOptions: {
      output: {
        // PERF (new): React and the router rarely change, so they get their own file that browsers keep cached across deploys.
        manualChunks: { react: ['react', 'react-dom', 'react-router-dom'] },
      },
    },
  },
});
