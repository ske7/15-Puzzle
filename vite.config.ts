import { fileURLToPath, URL } from 'node:url';

import { defineConfig, splitVendorChunkPlugin } from 'vite';
import vue from '@vitejs/plugin-vue';
import preload from 'vite-plugin-preload';
import UnpluginInjectPreload from 'unplugin-inject-preload/vite';

export default defineConfig({
  plugins: [
    vue(),
    splitVendorChunkPlugin(),
    preload({
      includeCss: false
    }),
    UnpluginInjectPreload({
      files: [
        {
          outputMatch: /^((?!index).)*\.css$/i
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
