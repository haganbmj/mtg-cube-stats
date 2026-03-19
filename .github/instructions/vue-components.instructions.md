---
description: "Use when creating or modifying Vue components, implementing Element Plus integration, handling reactive state, or working with component composition patterns."
applyTo: "src/**/*.vue"
---

# Vue Component Guidelines

## Component Structure

Use Composition API with `<script setup>` for all components:

```vue
<template>
    <!-- Template content -->
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { ComponentName } from 'element-plus';

const props = defineProps({
    // Props definition
});

// Reactive state and computed properties
</script>

<style scoped>
/* Component-specific styles */
</style>
```

## Props Definition

Use TypeScript-style prop definitions with proper validation:

```typescript
const props = defineProps({
    loadedCubes: {
        type: Object,
        required: true,
    },
    highlighted: {
        type: Array as () => string[],
        required: true,
    },
    totalCards: {
        type: Number,
        required: true,
    },
});
```

## Reactive State Patterns

**Refs for primitive values**:
```typescript
const currentPage = ref(1);
const searchInput = ref('');
const activeFilters = ref({});
```

**Computed for derived values**:
```typescript
const filterableManaValues = computed(() => {
    const cmcs = new Set<number>();
    Object.values(props.loadedCubes).forEach((cube: any) => {
        cube.cards.forEach((card: any) => {
            if (card.cmc !== undefined && card.cmc !== null) {
                cmcs.add(card.cmc);
            }
        });
    });
    return Array.from(cmcs).sort((a, b) => a - b);
});
```

## Element Plus Integration

**Import components explicitly**:
```typescript
import { TableInstance } from 'element-plus';
import type { SortBy } from 'element-plus';
import { Search } from '@element-plus/icons-vue';
```

**Template refs for Element Plus components**:
```typescript
const cardSummaryTableRef = ref<TableInstance>();
```

**Use Element Plus utility components**:
```vue
<template>
    <el-row :gutter="20">
        <el-col :span="12" :xs="24">
            <el-space>
                <el-input v-model="searchInput" />
                <el-button @click="resetFilters">Reset</el-button>
            </el-space>
        </el-col>
    </el-row>
</template>
```

## Mobile Responsiveness

Always implement mobile-first responsive design:

```javascript
const isMobile = computed(() => {
    return screen.width <= 760;
});

const paginationLayout = computed(() => {
    return isMobile.value ? 'prev, pager, next' : '->, prev, pager, next, sizes';
});
```

Use Element Plus responsive props:
```vue
<el-col :span="12" :xs="24" :sm="24" :md="8">
```

## Table Patterns

**Filter configuration**:
```javascript
const tags = [
    { text: 'counterspell', value: 'counterspell', color: 'rgba(20, 155, 226, 0.3)' },
    { text: 'draw', value: 'draw', color: 'rgba(30, 144, 255, 0.3)' },
];

const getTagColor = (tag: string) => {
    return tags.find(t => t.value.toLowerCase() === tag.toLowerCase())?.color ?? 'rgba(200, 200, 200, 0.3)';
};
```

**Table column definitions**:
```vue
<el-table-column
    prop="cubeCount"
    column-key="cubes"
    label="Cubes"
    min-width="75"
    max-width="100"
    :align="'center'"
    :filters="filterableCubes"
    sortable="custom"
    filterable
/>
```

**Custom column templates**:
```vue
<el-table-column label="Colors">
    <template #default="{ row }">
        <i
            v-for="color in row.effectiveColors"
            :key="color"
            :class="'ms ms-' + color.toLowerCase() + ' ms-cost'"
        ></i>
    </template>
</el-table-column>
```

## Event Handling

**Table events**:
```vue
<el-table
    @filter-change="onFilterChange"
    @sort-change="onSortChange"
>
```

**Input events**:
```vue
<el-input
    v-model="searchInput"
    @change="onSearchChange"
/>
```

## Data Processing Patterns

**Array transformations with sorting**:
```javascript
const keywords = computed(() => {
    return Object.entries(props.keywords).map(([key, value]) => {
        return {
            keyword: key,
            evergreen: isEvergreenKeyword(key),
            count: value,
            percentage: value / props.totalCards,
        };
    }).sort((a, b) => castInensitiveSort(b.keyword, a.keyword));
});
```

**Filtering lists**:
```javascript
const expandedCubeList = (cubeKeys: string[]) => {
    return Object.entries(props.loadedCubes)
        .map(([key, cube]) => ({
            id: cube.id,
            key: key,
            name: cube.name,
            included: cubeKeys.includes(key),
        }))
        .sort((a, b) => a.name.localeCompare(b.name));
};
```

## Icon Integration

Use Element Plus icons with proper imports:
```vue
<template>
    <el-input>
        <template #prefix>
            <el-icon class="el-input__icon"><search /></el-icon>
        </template>
    </el-input>
</template>

<script setup lang="ts">
import { Search } from '@element-plus/icons-vue';
</script>
```

## Styling Conventions

**Use Element Plus utilities**:
```vue
<el-text tag="i">Filtered to {{ count }} Cards</el-text>
<el-tag type="success" size="small">Yes</el-tag>
```

**Custom CSS classes with scoped styling**:
```vue
<style scoped>
.responsive-input {
    width: 300px;
}

@media (max-width: 760px) {
    .responsive-input {
        width: 100%;
    }
}
</style>
```

## Common Anti-patterns

- **Don't** use Options API - stick with Composition API `<script setup>`
- **Don't** forget mobile responsiveness - always test small screens
- **Don't** import entire Element Plus - use tree-shaking with specific imports
- **Don't** mutate props directly - use computed or emit events
- **Don't** forget TypeScript types for complex props like arrays or objects
