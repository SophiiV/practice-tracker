import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Конфігурація збирача Vite.
// Проксі: усі запити з фронтенду на /api/... перенаправляються на mock REST API
// (json-server на порту 3001), а префікс /api відкидається.
// Так у коді клієнта використовуються "справжні" шляхи REST (/api/assignments),
// які згодом без змін працюватимуть з реальним backend на Express.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: process.env.API_TARGET || 'http://localhost:3001',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
});
