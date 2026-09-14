import './assets/main.css';
import { createApp, type Component } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import { useBaseStore } from './stores/base';

const app = createApp(App as Component);
const pinia = createPinia();
app.use(pinia);

if (import.meta.env.MODE === 'test') {
  const store = useBaseStore(pinia);
  window.__cage15Test__ = {
    getMixedOrders: () => store.mixedOrders,
    getCurrentOrders: () => store.currentOrders,
    getNumLines: () => store.numLines
  };
}

app.mount('#app');
