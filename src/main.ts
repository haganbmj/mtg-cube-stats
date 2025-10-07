import { createApp } from 'vue';
import ElementPlus from 'element-plus';
import * as ElementPlusIconsVue from '@element-plus/icons-vue';

import { registerTheme } from 'echarts';
import darkbmjTheme from './echarts/theme.mjs';

registerTheme('darkbmj', darkbmjTheme);

import 'element-plus/dist/index.css';
import 'element-plus/theme-chalk/dark/css-vars.css'

import App from './App.vue';

const app = createApp(App)

for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
    app.component(key, component);
}

app.use(ElementPlus)
    .mount('#app');
