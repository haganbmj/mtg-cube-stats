<template>
    <el-pagination
        style="margin-top: 16px; text-align: right;"
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :page-sizes="[25, 50, 100, 250]"
        layout="sizes, total, ->, prev, pager, next, jumper"
        :total="filteredRows.length"
    />

    <div style="height: 600px;" v-if="usev2">
        <el-auto-resizer style="max-height: 600px;">
            <template #default=" { height, width }">
                <el-table-v2
                    v-model:sort-state="sortState"
                    :columns="columns"
                    :data="visibleRows"
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

    <el-table v-if="!usev2"
        :data="visibleRows"
        :defaut-sort="{ prop: 'cubeCount', order: 'descending' }"
        :preserve-expanded-content="false"
        @filter-change="onFilterChange"
        @sort-change="onSortChange"
        style="width: 100%"
        table-layout="auto"
        stripe
    >
        <el-table-column fixed prop="index" label="#" width="50" />
        <el-table-column prop="name" label="Name" min-width="150" max-width="300" sortable="custom">
            <template #default="{ row }">
                <el-link :href="`https://scryfall.com/card/${row.setCode?.toLowerCase()}/${row.collectorNumber}`" target="_blank">{{ row.name }}</el-link>
            </template>
        </el-table-column>

        <el-table-column
            prop="cubeCount"
            label="Cubes"
            min-width="75"
            max-width="100"
            :align="'center'"
            sortable="custom"
        />
        <!-- <el-table-column prop="count" label="Total Count" min-width="75" max-width="100" sortable /> -->

        <!-- <el-table-column prop="colorIdentity" label="Color Identity" min-width="100" max-width="150" show-overflow-tooltip /> -->
        <el-table-column
            prop="effectiveColors"
            column-key="effectiveColors"
            label="Colors"
            min-width="75"
            max-width="100"
            :align="'center'"
            :filters="[
                { text: 'White', value: 'w', },
                { text: 'Blue', value: 'u', },
                { text: 'Black', value: 'b', },
                { text: 'Red', value: 'r', },
                { text: 'Green', value: 'g', },
                { text: 'Colorless', value: 'c', }
            ]"
            filterable
        >
            <template #default="{ row }">
                <i
                    v-for="color in row.effectiveColors"
                    :key="color"
                    :class="'ms ms-' + color.toLowerCase() + ' ms-cost'"
                    style="margin-right: 4px;"
                ></i>
            </template>
        </el-table-column>
        <el-table-column
            prop="cmc"
            column-key="cmc"
            label="MV"
            min-width="75"
            max-width="100"
            :align="'center'"
            sortable="custom"
        />
        <el-table-column
            prop="typeLine"
            column-key="typeLine"
            label="Type Line"
            min-width="175"
            max-width="350"
            :filters="[
                { text: 'Creature', value: 'Creature' },
                { text: 'Instant', value: 'Instant' },
                { text: 'Sorcery', value: 'Sorcery' },
                { text: 'Enchantment', value: 'Enchantment' },
                { text: 'Artifact', value: 'Artifact' },
                { text: 'Planeswalker', value: 'Planeswalker' },
                { text: 'Land', value: 'Land' }
            ]"
            :filter-multiple="false"
            show-overflow-tooltip
            sortable="custom"
            filterable
        />

        <el-table-column
            prop="setCode"
            column-key="setCode"
            label="Set"
            min-width="75"
            max-width="100"
            :filters="filterableSets.map(set => ({ text: set, value: set }))"
            filter-class-name="set-filter"
            sortable="custom"
            filterable
        />
        <el-table-column
            prop="releaseDate"
            label="Release Date"
            min-width="100"
            max-width="150"
            sortable="custom"
        />
        <!-- <el-table-column prop="rarity" label="Rarity" min-width="75" max-width="100" sortable /> -->
        <!-- <el-table-column prop="oracleTextWordCount" label="Word Count" min-width="75" max-width="100" sortable /> -->
        <!-- <el-table-column prop="isUniversesBeyond" label="Universes Beyond" min-width="50" max-width="75" sortable /> -->
        <!-- <el-table-column prop="isSupplementalProduct" label="Supplemental Product" min-width="50" max-width="75" sortable /> -->
    </el-table>

    <el-pagination
        style="margin-top: 16px; text-align: right;"
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :page-sizes="[25, 50, 100, 250]"
        layout="sizes, total, ->, prev, pager, next, jumper"
        :total="filteredRows.length"
    />
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
    loadedCubes: {
        type: Object,
        required: true,
    },
});

const usev2 = ref(false);
const currentPage = ref(1);
const pageSize = ref(50);
const activeFilters = ref({});
const activeSort = ref<SortBy | null>({ prop: 'cubeCount', order: 'descending' });

const filterableSets = computed(() => {
    const sets = new Set<string>();
    Object.values(props.loadedCubes).forEach((cube: any) => {
        cube.cards.forEach((card: any) => {
            if (card.setCode) {
                sets.add(card.setCode.toUpperCase());
            }
        });
    });
    return Array.from(sets).sort();
});

const onFilterChange = (filters: Record<string, string[]>) => {
    activeFilters.value = filters;
    currentPage.value = 1;
};

const onSortChange = (sortInfo: SortBy) => {
    activeSort.value = sortInfo;
    currentPage.value = 1;
};

const tableData = computed(() => {
    if (Object.keys(props.loadedCubes).length === 0) {
        return [];
    }
    const allCards = Object.keys(props.loadedCubes).reduce((allCards, key) => {
        props.loadedCubes[key].cards.forEach(card => {
            if (allCards[card.oracleId] === undefined) {
                allCards[card.oracleId] = {
                    ...card,
                    effectiveColors: card.colorIdentity.length === 0 ? ['C'] : card.colorIdentity,
                    count: 0,
                    cubes: [], // TODO:
                    cubeCount: 0,
                };
            }

            allCards[card.oracleId].count += 1;
            if (!allCards[card.oracleId].cubes.includes(key)) {
                allCards[card.oracleId].cubes.push(key);
                allCards[card.oracleId].cubeCount += 1;
            }
        });

        return allCards;
    }, {});

    return Object.values(allCards);
});

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

const sortedRows = computed(() => {
    const alphaSorted = tableData.value.slice(0).sort((a, b) => {
        if (a['name'] < b['name']) return -1;
        if (a['name'] > b['name']) return 1;
        return 0;
    });

    if (!activeSort.value) {
        return alphaSorted.map((card, index) => {
            return {
                ...card,
                index: index + 1, // Attach an index value to each row, using the full list rather than the visible one.
            };
        });
    }

    // TODO: Manually sort color in WUBRG order.
    return alphaSorted.slice(0).sort((a, b) => {
        const sortKey = activeSort.value.prop;
        const sortOrder = activeSort.value.order === 'ascending' ? TableV2SortOrder.ASC : TableV2SortOrder.DESC;

        // FIXME: Add a default secondary sort to alphabetize by name.
        if (sortOrder === TableV2SortOrder.ASC) {
            if (a[sortKey] < b[sortKey]) return -1;
            if (a[sortKey] > b[sortKey]) return 1;
            return 0;
        } else {
            if (a[sortKey] > b[sortKey]) return -1;
            if (a[sortKey] < b[sortKey]) return 1;
            return 0;
        }
    }).map((card, index) => {
        return {
            ...card,
            index: index + 1, // Attach an index value to each row, using the full list rather than the visible one.
        };
    });
});

const filteredRows = computed(() => {
    console.log('Active Filters:', activeFilters.value);
    if (Object.keys(activeFilters.value).length === 0) {
        return sortedRows.value;
    } else {
        return sortedRows.value.filter(row => {
            for (const [key, values] of Object.entries(activeFilters.value)) {
                if (values.length === 0) {
                    continue;
                }
                if (key === 'effectiveColors') {
                    // Special handling for effectiveColors filter
                    const rowColors = row.effectiveColors.map((c: string) => c.toLowerCase());
                    const matches = values.some(value => rowColors.includes(value.toLowerCase()));
                    if (!matches) {
                        return false;
                    }
                } else if (key === 'typeLine') {
                    // Special handling for typeLine filter
                    const matches = values.some(value => row.typeLine.includes(value));
                    if (!matches) {
                        return false;
                    }
                } else if (key === 'setCode') {
                    // Special handling for setCode filter
                    if (!values.includes(row.setCode?.toUpperCase())) {
                        return false;
                    }
                } else {
                    // General case
                    if (!values.includes(row[key])) {
                        return false;
                    }
                }
            }
            return true;
        });
    }
});

const visibleRows = computed(() => {
    return filteredRows.value.slice((currentPage.value - 1) * pageSize.value, currentPage.value * pageSize.value);
});
</script>
