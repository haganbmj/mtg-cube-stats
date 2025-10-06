<template>
    <div class="common-layout">
        <el-container>
            <el-header>
                <el-row :gutter="20">
                    <el-col :span="16">
                        <el-breadcrumb separator=" / ">
                            <el-breadcrumb-item>
                                <a href="https://griselbrand.com">griselbrand.com</a>
                            </el-breadcrumb-item>
                            <el-breadcrumb-item>Cube Comparison</el-breadcrumb-item>
                        </el-breadcrumb>
                    </el-col>
                    <el-col :span="8">
                        <div style="justify-content: flex-end; display: flex;">
                            <a href="https://bsky.app/profile/griselbrand.com" target="_blank">Bluesky</a>
                            <el-divider direction="vertical" />
                            <a href="https://github.com/haganbmj/mtg-cube-stats" target="_blank">Github</a>
                        </div>
                    </el-col>
                </el-row>
            </el-header>
            <el-main>
                <div id="inputs">
                    <el-form :model="addCubeForm" :inline="true" @submit.prevent="submitAddCubeForm" v-loading="addCubeForm.loading">
                        <el-form-item>
                            <el-select label="Collections" v-model="addCubeForm.presetComparisonsSelection" @change="loadPresetCollection" placeholder="Load Collection..." style="width: 200px;">
                                <el-option
                                    v-for="option in presetComparisonsSelect"
                                    :key="option.value"
                                    :label="option.label"
                                    :value="option.value"
                                />
                            </el-select>
                        </el-form-item>
                        <el-form-item>OR</el-form-item>
                        <el-form-item style="margin-right: 6px;">
                            <el-input v-model="addCubeForm.cubeId" placeholder="Enter Cube ID" :disabled="addCubeForm.loading" autofocus />
                        </el-form-item>
                        <el-form-item>
                            <el-button type="primary" @click="submitAddCubeForm" :disabled="addCubeForm.loading">Add</el-button>
                            <input type="submit" style="display: none;" />
                        </el-form-item>
                    </el-form>
                </div>
                <div id="contents">
                    <el-tabs tab-position="top" v-model="activeTab">
                        <el-tab-pane label="Overview" name="overview">
                            <el-space direction="horizontal" style="width: 100%; justify-content: space-between; align-items: center; margin-bottom: 1em;">
                                <el-text tag="i">Loaded Cubes: {{ Object.keys(loadedCubes).length }}</el-text>
                                <el-form :inline="true" style="justify-content: flex-end; display: flex;">
                                    <el-form-item label="Exclude Lands:">
                                        <el-switch v-model="config.excludeLands" active-color="#13ce66" inactive-color="#ff4949" />
                                    </el-form-item>
                                    <el-form-item label="Columns:">
                                        <el-select
                                            v-model="config.visibleColumns"
                                            multiple
                                            collapse-tags
                                            label="Visible Columns"
                                            placeholder="Select columns"
                                            style="width:250px;"
                                        >
                                            <el-option-group
                                                v-for="group in columnOptions"
                                                :key="group.label"
                                                :label="group.label"
                                            >
                                                <el-option
                                                    v-for="item in group.options"
                                                    :key="item.value"
                                                    :label="item.label"
                                                    :value="item.value"
                                                />
                                            </el-option-group>
                                        </el-select>
                                    </el-form-item>
                                </el-form>
                            </el-space>

                            <el-table
                                :data="tableData"
                                :defaut-sort="{ prop: 'name', order: 'ascending' }"
                                :preserve-expanded-content="false"
                                style="width: 100%"
                                table-layout="auto"
                                stripe
                            >
                                <el-table-column fixed width="25" type="expand">
                                    <!-- <template #expand="props">
                                        <el-image :src="props.row.thumbnail" fit="contain" style="width: 50px; height: 35px;" />
                                    </template> -->
                                    <template #default="props">
                                        <pre>{{ props.row }}</pre>
                                    </template>
                                </el-table-column>
                                <el-table-column fixed prop="thumbnail" label="" width="75">
                                    <template #default="{ row }">
                                        <el-image :src="row.thumbnail" fit="contain" style="width: 50px; height: 35px;" />
                                    </template>
                                </el-table-column>
                                <el-table-column prop="name" label="Name" min-width="150" max-width="300" show-overflow-tooltip sortable>
                                    <template #default="{ row }">
                                        <el-link :href="`https://cubecobra.com/cube/overview/${row.id}`" target="_blank">{{ row.name }}</el-link>
                                    </template>
                                </el-table-column>
                                <el-table-column prop="owner" label="Owner" min-width="100" max-width="150" show-overflow-tooltip sortable>
                                    <template #default="{ row }">
                                        <el-link :href="`https://cubecobra.com/user/view/${row.ownerId}`" target="_blank">{{ row.owner }}</el-link>
                                    </template>
                                </el-table-column>
                                <el-table-column prop="category" label="Category" min-width="100" max-width="125" sortable v-if="config.visibleColumns.includes('category')" />
                                <el-table-column prop="categoryPrefixes" label="Category Prefixes" min-width="100" max-width="125" show-overflow-tooltip sortable v-if="config.visibleColumns.includes('categoryPrefixes')" />
                                <el-table-column prop="stats.totalCards" label="Total Cards" min-width="75" max-width="100" sortable v-if="config.visibleColumns.includes('stats.totalCards')" />
                                <el-table-column prop="stats.landCards" label="Lands" min-width="75" max-width="100" sortable v-if="config.visibleColumns.includes('stats.landCards')" />
                                <el-table-column prop="stats.averageElo" label="Avg. Card Elo" min-width="75" max-width="100" sortable :formatter="toFixed2" v-if="config.visibleColumns.includes('stats.averageElo')" />
                                <el-table-column prop="stats.averagePopularity" label="Avg. Card Popularity" min-width="75" max-width="100" sortable :formatter="toFixed2" v-if="config.visibleColumns.includes('stats.averagePopularity')" />
                                <el-table-column prop="stats.universesBeyond" label="Universes Beyond" min-width="75" max-width="100" sortable v-if="config.visibleColumns.includes('stats.universesBeyond')" />
                                <el-table-column prop="stats.supplementalProduct" label="Supplemental Product" min-width="75" max-width="100" sortable v-if="config.visibleColumns.includes('stats.supplementalProduct')" />
                                <el-table-column prop="stats.abnormalLayout" label="Abnormal Layout" min-width="75" max-width="100" sortable v-if="config.visibleColumns.includes('stats.abnormalLayout')" />
                                <el-table-column prop="stats.makesTokens" label="Makes Tokens" min-width="75" max-width="100" sortable v-if="config.visibleColumns.includes('stats.makesTokens')" />

                                <el-table-column label="" min-width="60">
                                    <template #default="scope">
                                        <el-button size="small" type="danger" @click="removeCube(scope.row.id)">
                                            <el-icon><Delete /></el-icon>
                                        </el-button>
                                    </template>
                                </el-table-column>
                            </el-table>
                        </el-tab-pane>

                        <el-tab-pane label="Contents" name="contents">
                            <p>Coming soon...</p>
                        </el-tab-pane>
                    </el-tabs>
                </div>
            </el-main>
        </el-container>
    </div>
</template>

<script lang="ts" setup>
import { ref, reactive, computed, watch } from 'vue';
import { getNestedProp } from './util/HelperFunctions.mjs';
import { remapCube, analyzeCubeContents, enrichCubeContents } from './util/CubeFunctions.mjs';
import { getCubeData } from './util/CubeCobra.mjs';

const presetComparisons = {
    "CubeCon 2025": () => import("../data/cubes-cubecon2025.json"),
    "haganbmj": () => import("../data/cubes-haganbmj.json"),
    "Peasant Discord": () => import("../data/cubes-peasantDiscord.json"),
};

// TODO: Bind this to localStorage.
const config = reactive({
    excludeLands: false,
    visibleColumns: ['stats.totalCards', 'stats.landCards', 'stats.averageElo', 'stats.averagePopularity' ],
});

const addCubeForm = reactive({
    loading: false,
    cubeId: '',
});

const loadedCubes = reactive({});

const loadPresetCollection = async (presetName: string) => {
    if (presetName in presetComparisons) {
        addCubeForm.loading = true;
        const cubesModule = await presetComparisons[presetName]();
        const enrichedCubes = Object.fromEntries(Object.entries(cubesModule.default).map(cube => [cube[0], { ...cube[1], cards: enrichCubeContents(cube[1].cards) }]));
        Object.keys(loadedCubes).forEach(key => delete loadedCubes[key]);
        Object.assign(loadedCubes, enrichedCubes);
        addCubeForm.loading = false;
        addCubeForm.presetComparisonsSelection = '';
    }
};

const presetComparisonsSelect = ref(presetComparisons ? Object.keys(presetComparisons).map(key => ({ label: key, value: key })) : []);

const activeTab = ref('overview');

const columnOptions = ref([
    {
        label: 'Core',
        options: [
            // { value: 'thumbnail', label: "Thumbnail" },
            // { value: 'name', label: "Name" },
            // { value: 'owner', label: "Owner" },
            { value: 'category', label: "Category" },
            { value: 'categoryPrefixes', label: "Category Prefixes" },
            { value: 'stats.totalCards', label: "Total Cards" },
            { value: 'stats.landCards', label: "Lands" },
            { value: 'stats.averageElo', label: "Avg. Card Elo" },
            { value: 'stats.averagePopularity', label: "Avg. Card Popularity" },
        ],
    },
    {
        label: 'Product Line',
        options: [
            { value: 'stats.universesBeyond', label: "Universes Beyond" },
            { value: 'stats.supplementalProduct', label: "Supplemental Product" },
        ],
    },
    {
        label: 'Characteristics',
        options: [
            { value: 'stats.abnormalLayout', label: "Abnormal Layout" },
            { value: 'stats.makesTokens', label: "Makes Tokens" },
        ],
    },
]);

const tableData = computed(() => {
    return Object.entries(loadedCubes).map(([id, cube]) => {
        return {
            ...cube,
            stats: analyzeCubeContents(cube.cards, config.excludeLands),
        }
    });
});

const submitAddCubeForm = async () => {
    addCubeForm.loading = true;
    if (!(addCubeForm.cubeId in loadedCubes)) {
        try {
            const rawCube = await getCubeData(addCubeForm.cubeId);
            loadedCubes[addCubeForm.cubeId] = remapCube(rawCube);
        } catch (e) {
            console.error("Error loading cube:", e);
        }
    }

    addCubeForm.cubeId = '';
    addCubeForm.loading = false;
};

const removeCube = (cubeId: string) => {
    delete loadedCubes[cubeId];
};

const toFixed2 = (row, column) => {
    return (getNestedProp(row, column.property) ?? 0).toFixed(2);
}

</script>

<style lang="scss">
html.dark {
    --el-color-primary: #5755d9;

    --el-color-primary-light-3: #4b48d6;
    --el-color-primary-light-5: #4b48d6;
    --el-color-primary-light-7: #4b48d6;
    --el-color-primary-light-8: #514fea;
    --el-color-primary-light-9: #514fea;

    --el-color-primary-dark-2: #514fea;
    --el-color-primary-dark-3: #514fea;
    --el-color-primary-dark-5: #4b48d6;
    --el-color-primary-dark-7: #4b48d6;
    --el-color-primary-dark-8: #3f3db6;
    --el-color-primary-dark-9: #3f3db6;
}

.el-header {
    padding-top: 1em;
    padding-bottom: 1em;
    height: unset;

    background: var(--el-fill-color-lighter);
    border-bottom: 1px solid var(--el-border-color);

    a {
        text-decoration: none;
        color: var(--el-text-color-secondary);

        &:hover {
            color: var(--el-color-primary);
        }
    }
}

body {
    font-family: Inter,Helvetica Neue,Helvetica,PingFang SC,Hiragino Sans GB,Microsoft YaHei,微软雅黑,Arial,sans-serif;
    font-weight: 350;
    font-size: 14px;

    margin: 0px auto;
}

.el-table .cell {
    line-height: 20px;
}

.el-select-group__title {
    padding: 0 10px;
}
</style>
