import { fileURLToPath, URL } from 'node:url';

import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import preload from 'vite-plugin-preload';
import UnpluginInjectPreload from 'unplugin-inject-preload/vite';
import { fakeApi } from './dev-api/plugin.ts';

export default defineConfig(({ mode }) => ({
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) {
            return undefined;
          }
          // Vue itself plus the @vue/* internals and the @vueuse/* helpers built on them.
          // Matched on a package-name boundary rather than `id.includes('vue')`, which
          // also caught @vueuse by accident and would catch any future dependency with
          // "vue" anywhere in its path.
          if (/[\\/]node_modules[\\/](vue|vue-demi|@vue[\\/]|@vueuse[\\/])/.test(id)) {
            return 'vue';
          }
          return 'vendor';
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
    }),
    mode === 'devex' && fakeApi()
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  server: {
    port: 8080
  }
}));
