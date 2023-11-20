import { fileURLToPath, URL } from 'node:url';

import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import preload from 'vite-plugin-preload';
import UnpluginInjectPreload from 'unplugin-inject-preload/vite';

export default defineConfig({
  plugins: [
    vue(),
    preload(),
    UnpluginInjectPreload({
      files: [
        {
          outputMatch: /[a-z-0-9]*.(css)$/i
        }
      ],
      injectTo: 'head'
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
