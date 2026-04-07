import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-codemirror': [
            '@codemirror/lang-javascript',
            '@codemirror/lang-css',
            '@codemirror/lang-html',
            '@codemirror/lang-json',
            '@codemirror/lang-markdown',
            '@codemirror/theme-one-dark',
          ],
          'vendor-lucide': ['lucide-react'],
        },
      },
    },
  },
});
