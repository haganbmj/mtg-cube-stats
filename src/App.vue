<template>
    <div class="common-layout">
        <el-container>
            <el-header>
                <h2>Cube Comparison</h2>
            </el-header>
            <el-main>
                <div id="inputs">
                    <el-form :model="addCubeForm" :inline="true" label-width="80px" @submit.prevent="submitAddCubeForm">
                        <el-form-item label="Cube ID">
                            <el-input v-model="addCubeForm.cubeId" placeholder="Cube ID" />
                        </el-form-item>
                        <el-form-item>
                            <el-button type="primary" @click="submitAddCubeForm">Add</el-button>
                        </el-form-item>
                    </el-form>

                    <el-select
                        v-model="visibleColumns"
                        multiple
                        collapse-tags
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

                </div>
                <div id="contents">
                    <el-table
                        :data="tableData"
                        :defaut-sort="{ prop: 'name', order: 'ascending' }"
                        style="width: 100%"
                        stripe
                    >
                        <el-table-column fixed prop="thumbnail" label="" width="75">
                            <template #default="{ row }">
                                <el-image :src="row.thumbnail" fit="contain" style="width: 50px; height: 35px;" />
                            </template>
                        </el-table-column>
                        <el-table-column fixed prop="name" label="Name" min-width="150" max-width="200" show-overflow-tooltip sortable>
                            <template #default="{ row }">
                                <el-link :href="`https://cubecobra.com/cube/overview/${row.id}`" target="_blank">{{ row.name }}</el-link>
                            </template>
                        </el-table-column>
                        <el-table-column fixed prop="owner" label="Owner" min-width="100" max-width="150" show-overflow-tooltip sortable>
                            <template #default="{ row }">
                                <el-link :href="`https://cubecobra.com/user/view/${row.ownerId}`" target="_blank">{{ row.owner }}</el-link>
                            </template>
                        </el-table-column>
                        <el-table-column prop="stats.totalCards" label="Cards" min-width="75" sortable v-if="visibleColumns.includes('stats.totalCards')" />
                        <el-table-column prop="stats.universesBeyond" label="Universes Beyond" min-width="75" sortable />
                        <el-table-column prop="stats.supplementalProduct" label="Supplemental" min-width="75" sortable />
                        <el-table-column prop="stats.abnormalLayout" label="Abnormal Layout" min-width="75" sortable />
                        <el-table-column prop="stats.makesTokens" label="Makes Tokens" min-width="75" sortable />

                        <el-table-column label="" min-width="60">
                            <template #default="scope">
                                <el-button size="small" type="danger" @click="removeCube(scope.row.id)">
                                    <el-icon><Delete /></el-icon>
                                </el-button>
                            </template>
                        </el-table-column>
                    </el-table>
                </div>
            </el-main>
        </el-container>
    </div>
</template>

<script lang="ts" setup>
import { ref, reactive, computed } from 'vue';
import { remapCube, analyzeCubeContents } from './util/CubeFunctions.mjs';
// import testCube from '../data/c.json';
import haganbmj from '../data/cubes-haganbmj.json';

const addCubeForm = reactive({
    cubeId: '',
});

const loadedCubes = reactive({
    // "testCube": remapCube(testCube),
    ...haganbmj,
});

// TODO: Bind this to localStorage.
const visibleColumns = ref(['thumbnail', 'name', 'owner', 'stats.totalCards' ]);
const columnOptions = ref([
    {
        label: 'Core',
        options: [
            { value: 'thumbnail', label: "Thumbnail" },
            { value: 'name', label: "Name" },
            { value: 'owner', label: "Owner" },
            { value: 'stats.totalCards', label: "Total Cards" },
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
            id: id,
            name: cube.name,
            owner: cube.owner,
            ownerId: cube.ownerId,
            thumbnail: cube.thumbnail,
            stats: analyzeCubeContents(cube.cards),
        }
    });
});

const submitAddCubeForm = () => {
    console.log('submitAddCubeForm', addCubeForm.cubeId);
    // TODO: Fetch cube data from API and add to loadedCubes
    addCubeForm.cubeId = '';
};

const removeCube = (cubeId: string) => {
    delete loadedCubes[cubeId];
};

// console.log(analyzeCubeContents(haganbmj['5d5f69612af66a30f9bb9b10'].cards));

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

body {
    font-family: Inter,Helvetica Neue,Helvetica,PingFang SC,Hiragino Sans GB,Microsoft YaHei,微软雅黑,Arial,sans-serif;
    font-weight: 350;
}

.el-table .cell {
    line-height: 20px;
}
</style>
