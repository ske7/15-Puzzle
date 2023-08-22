import { fileURLToPath, URL } from 'node:url';

import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import preload from 'vite-plugin-preload';
import VitePluginInjectPreload from 'vite-plugin-inject-preload';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    preload(),
    VitePluginInjectPreload({
      files: [
        {
          match: /[a-z-0-9]*.(css)$/i
        }
      ]
    })
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  server: {
    port: 8080
  }
});
