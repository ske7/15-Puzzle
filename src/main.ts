import './assets/main.css';
import type { defineComponent } from 'vue';
import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';

const app = createApp(App as unknown as typeof defineComponent);
app.use(createPinia()).mount('#app');
