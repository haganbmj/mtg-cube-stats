<template>
    <div style="height: 500px;">
        <el-auto-resizer style="max-height: 500px;">
            <template #default=" { height, width }">
                <el-table-v2
                    v-model:sort-state="sortState"
                    :columns="columns"
                    :data="rows"
                    :cache="50"
                    :width="width"
                    :height="height"
                    @column-sort="onSort"
                    fixed
                />
            </template>
        </el-auto-resizer>
        <!-- <div>{{ rows }}</div> -->
        <!-- <div>{{ props.data }}</div> -->
    </div>
</template>

<script setup lang="ts">
import { TableV2SortOrder } from 'element-plus';
import type { SortBy, SortState } from 'element-plus';
import { ref, computed } from 'vue';

const props = defineProps({
    data: {
        type: Object,
        required: true,
    },
});

// const width = 2500;
// const height = 500;

const columns = [
    { key: 'name', title: 'Name', dataKey: 'name', sortable: true, width: 250, fixed: 'left', },
    { key: 'typeLine', title: 'Type Line', dataKey: 'typeLine', width: 250 },
    { key: 'cubeCount', title: 'Cube Count', dataKey: 'cubeCount', sortable: true, width: 100 },
    { key: 'count', title: 'Total Count', dataKey: 'count', sortable: true, width: 100 },
    { key: 'releaseDate', title: 'Release Date', dataKey: 'releaseDate', sortable: true, width: 150 },
    { key: 'rarity', title: 'Rarity', dataKey: 'rarity', width: 100 },
    { key: 'isUniversesBeyond', title: 'Universes Beyond', dataKey: 'isUniversesBeyond', width: 75 },
    { key: 'isSupplementalProduct', title: 'Supplemental Product', dataKey: 'isSupplementalProduct', width: 75 },
];

// const rows = computed(() => {
//     return props.data;
//     return props.data.map(c => {
//         return {
//             name: c.name,
//             count: c.count,
//             cubeCount: c.cubeCount,
//         }
//     });
// });

const rows = computed(() => {
    return props.data.slice(0).sort((a, b) => {
        return sortState.value['cubeCount'] === TableV2SortOrder.ASC ? b.cubeCount - a.cubeCount : a.cubeCount - b.cubeCount;
    });
});

const sortState = ref<SortState>({
    'cubeCount': TableV2SortOrder.DESC,
    'name': TableV2SortOrder.ASC,
});

const onSort = ({ key, order } : SortBy) => {
    console.log('onSort', key, order);
    sortState.value[key] = order;
    // props.data.value = props.data.value.reverse();
}
</script>
