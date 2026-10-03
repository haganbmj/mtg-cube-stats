import { createApp } from 'vue';
import { registerTheme, use } from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import { LineChart, BarChart, HeatmapChart, ScatterChart } from 'echarts/charts';
import { GridComponent, TooltipComponent, LegendComponent, TitleComponent, ToolboxComponent, MarkLineComponent, MarkAreaComponent, DataZoomComponent, VisualMapComponent } from 'echarts/components';
import ElementPlus from 'element-plus';
import * as ElementPlusIconsVue from '@element-plus/icons-vue';

import 'element-plus/dist/index.css';
import 'element-plus/theme-chalk/dark/css-vars.css'
import 'mana-font/css/mana.css';
import './viewer/styles.css';

import darkbmjTheme from '../../src/echarts/theme';
import TrendsApp from './viewer/TrendsApp.vue';

use([
    CanvasRenderer,
    LineChart,
    BarChart,
    HeatmapChart,
    ScatterChart,
    GridComponent,
    TooltipComponent,
    LegendComponent,
    TitleComponent,
    ToolboxComponent,
    MarkLineComponent,
    MarkAreaComponent,
    DataZoomComponent,
    VisualMapComponent,
]);

registerTheme('darkbmj', darkbmjTheme);

const app = createApp(TrendsApp)

for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
    app.component(key, component);
}

app.use(ElementPlus)
    .mount('#app');
