import './assets/main.css';
import { createApp, defineComponent } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';

const app = createApp(App as unknown as typeof defineComponent);
app.use(createPinia()).mount('#app');
