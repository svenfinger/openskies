// @ts-check
import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

// https://astro.build/config
export default defineConfig({
  site: 'https://openskies.photos',
  integrations: [react()],
  vite: {
    plugins: [tailwindcss()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      proxy: {
        '/download': {
          target: 'https://cdn.openskies.photos',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/download\//, '/'),
        },
      },
    },
  },
});
