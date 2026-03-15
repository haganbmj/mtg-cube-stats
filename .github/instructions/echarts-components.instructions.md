---
description: "Use when creating or modifying ECharts components, implementing data visualizations, working with vue-echarts integration, or troubleshooting chart rendering issues."
applyTo: "src/components/**/*Chart*.vue"
---

# ECharts Component Guidelines

## Setup Pattern

Always use tree-shaking with explicit imports:

```vue
<script setup lang="ts">
import { computed } from 'vue';
import { use } from 'echarts/core';
import { BarChart } from 'echarts/charts';
import { CanvasRenderer } from 'echarts/renderers';
import { TitleComponent, TooltipComponent, GridComponent } from 'echarts/components';
import VChart from 'vue-echarts';

use([
    CanvasRenderer,
    TitleComponent,
    TooltipComponent,
    GridComponent,
    BarChart, // Only register needed chart types
]);
</script>
```

## Component Structure

```vue
<template>
    <VChart class="chart" :option="chartOptions" autoresize />
</template>

<script setup lang="ts">
// ... imports and use() calls

const props = defineProps({
    // Define required data props
});

const chartOptions = computed(() => {
    // Transform props into ECharts options
    return {
        title: { text: 'Chart Title', left: 'center' },
        // ... ECharts configuration
    };
});
</script>
```

## Data Processing Patterns

- **Percentage calculations**: Always handle division by zero
- **Computed reactivity**: Use `computed()` for chart options to ensure reactivity
- **Data transformation**: Transform props into ECharts-expected format within computed

```javascript
const chartOptions = computed(() => {
    const totalCards = Object.values(props.distribution).reduce((a, b) => a + b, 0);
    const data = Object.entries(props.distribution).map(([key, value]) => ({
        name: key,
        value: totalCards > 0 ? (100 * value / totalCards).toFixed(2) : 0,
        rawValue: value
    }));
    // ...
});
```

## Tooltip Standards

Use custom formatters for MTG-specific data:

```javascript
tooltip: {
    trigger: 'item',
    formatter: (args) => `<b>${args.name}</b><br/>${args.value}%<br/>${args.data.rawValue} Cards`
}
```

## Highlighting Logic

For comparison charts, implement highlighting with conditional styling:

```javascript
itemStyle: {
    color: highlighted.includes(cube.id) ? '#ffffff' : '#5470c6',
    opacity: highlighted.includes(cube.id) ? 1.0 : 0.6,
    borderColor: highlighted.includes(cube.id) ? '#ff6b6b' : undefined,
    borderWidth: highlighted.includes(cube.id) ? 2 : 0,
}
```

## Color Standards

- **MTG colors**: Use project color palette for mana colors
- **Highlighting**: White fill (`#ffffff`) with red border (`#ff6b6b`) 
- **Default**: Blue tones (`#5470c6`) with opacity variations
- **Colorless**: Gray (`#cfcfcf`)

## Performance Considerations

- Register only needed chart components to minimize bundle size
- Use `autoresize` prop for responsive behavior
- Avoid complex calculations in render - move to computed properties
- For large datasets (100+ cubes), consider data sampling or virtualization

## Chart-Specific Patterns

**Bar Charts**: Include percentage formatting on Y-axis labels
**Pie Charts**: Show both count and percentage in labels
**Scatter Plots**: Include cube names in tooltip, handle highlighting
**Box Plots**: Provide statistical context in tooltips (Q1, median, Q3)
