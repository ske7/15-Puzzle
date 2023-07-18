import { fileURLToPath, URL } from 'node:url';

import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import preload from 'vite-plugin-preload';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue(), preload()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  server: {
    port: 8080
  }
});
