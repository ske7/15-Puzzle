import { fileURLToPath, URL } from 'node:url';

import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import preload from 'vite-plugin-preload';
import UnpluginInjectPreload from 'unplugin-inject-preload/vite';

export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('vue')) {
              return 'vue';
            }
            return 'vendor';
          }
          return undefined;
        }
      },
    },
  },
  plugins: [
    vue(),
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
