<template>
    <el-dialog
        v-model="columnCustomizationVisible"
        title="Customize Columns"
        width="600"
        align-center
    >
        <div v-for="option in columnOptions" :key="option.label" style="margin-bottom: 1em;">
            <h4>{{ option.label }}</h4>
            <el-checkbox-group v-model="config.visibleColumns" style="width: 100%;">
                <el-row :gutter="10">
                    <el-col :span="12" :xs="24" :s="24" v-for="item in option.options" :key="item.value">
                        <el-checkbox
                            :label="item.value"
                        >
                            {{ item.label }}
                            <el-tooltip
                                v-if="item.tooltip"
                                :content="item.tooltip"
                                placement="top"
                                :hide-after="50"
                            >
                                <el-icon><InfoFilled /></el-icon>
                            </el-tooltip>
                        </el-checkbox>
                    </el-col>
                </el-row>
            </el-checkbox-group>
        </div>

        <template #footer>
            <el-button @click="columnCustomizationVisible = false">Close</el-button>
        </template>
    </el-dialog>

    <el-row>
        <el-col :span="18" :xs="24" :sm="24" :md="18" :lg="18">
            <el-form :model="addCubeForm" :inline="true" @submit.prevent="submitAddCubeForm" v-loading="addCubeForm.loading">
                <el-form-item>
                    <el-col :span="11" :xs="24" :sm="24" :md="11" :lg="11">
                        <el-form-item style="min-width: 200px; width: 100%;">
                            <el-select label="Collections" v-model="addCubeForm.presetComparisonsSelection" @change="handleLoadPreset" placeholder="Load Collection..." >
                                <el-option
                                    v-for="option in presetComparisonsSelect"
                                    :key="option.value"
                                    :label="option.label"
                                    :value="option.value"
                                />
                            </el-select>
                        </el-form-item>
                    </el-col>
                    <el-col :span="2" :xs="0" :sm="0" :md="2" :lg="2" style="text-align: center;">
                        <span class="text-gray-500">OR</span>
                    </el-col>
                    <el-col :span="11" :xs="24" :sm="24" :md="11" :lg="11" style="display: flex; align-items: center;">
                        <el-row :gutter="10">
                            <el-col :span="20">
                                <el-form-item style="min-width: 200px; width: 100%;">
                                    <el-input v-model="addCubeForm.cubeId" placeholder="Enter Cube ID" autofocus />
                                </el-form-item>
                            </el-col>
                            <el-col :span="4">
                                <el-form-item>
                                    <el-button type="primary" @click="submitAddCubeForm" :disabled="addCubeForm.loading">Add</el-button>
                                    <input type="submit" style="display: none;" />
                                </el-form-item>
                            </el-col>
                        </el-row>
                    </el-col>
                </el-form-item>
            </el-form>
        </el-col>
        <el-col :span="6" :xs="24" :sm="24" :md="6" :lg="6" style="text-align: right;">
            <el-button plain @click="columnCustomizationVisible = true" style="width: 100%; max-width: 250px;">Customize Columns</el-button>
        </el-col>
    </el-row>

    <el-table
        :data="overviewTableData"
        :default-sort="{ prop: 'name', order: 'ascending' }"
        style="width: 100%"
        table-layout="auto"
        stripe
    >
        <el-table-column fixed prop="thumbnail" label="" width="75">
            <template #default="{ row }">
                <el-image :src="row.thumbnail" class="remove-thumbnail" fit="contain" style="width: 50px; height: 35px;" />
                <el-button class="remove-button" size="small" type="danger" @click="removeCube(row.id)">
                    <el-icon><Delete /></el-icon>
                </el-button>
            </template>
        </el-table-column>
        <el-table-column type="index" label="#" width="50" v-if="config.visibleColumns.includes('rowNumber')" />
        <el-table-column prop="name" label="Name" min-width="150" max-width="300" show-overflow-tooltip sortable :sort-method="sortMethods.caseInsensitiveName" v-if="config.visibleColumns.includes('name')" >
            <template #default="{ row }">
                <el-link @click="openCubeDetailDialog(row.id)">{{ row.name }}</el-link>
                <template v-if="row.stats.graveyardOrderMatters">
                    <el-tooltip
                        content="This cube contains cards that care about Graveyard Order."
                        placement="top"
                        :hide-after="50"
                    >
                        <el-icon color="yellow" style="margin-left: 0.25rem;"><WarnTriangleFilled /></el-icon>
                    </el-tooltip>
                </template>
            </template>
        </el-table-column>
        <el-table-column prop="owner" label="Owner" min-width="100" max-width="150" show-overflow-tooltip sortable :sort-method="sortMethods.caseInsensitiveOwner"  v-if="config.visibleColumns.includes('owner')" >
            <template #default="{ row }">
                <el-link :href="`https://cubecobra.com/user/view/${row.ownerId}`" target="_blank">{{ row.owner }}</el-link>
            </template>
        </el-table-column>

        <el-table-column
            v-if="config.visibleColumns.includes('lastModified')"
            prop="lastModified"
            label="Last Modified"
            min-width="100"
            max-width="125"
            sortable
            :formatter="columnFormatters.toDate"
        />

        <el-table-column
            v-if="config.visibleColumns.includes('followerCount')"
            prop="followerCount"
            label="Followers"
            min-width="100"
            max-width="125"
            sortable
        />

        <el-table-column
            v-if="config.visibleColumns.includes('stats.arenaPlayable')"
            prop="stats.arenaPlayable"
            label="Arena Playable"
            min-width="75"
            max-width="75"
        >
            <template #default="{ row }">
                <el-tag :type="row.stats.arenaPlayable ? 'success' : 'danger'">
                    {{ row.stats.arenaPlayable ? 'Yes' : 'No' }}
                </el-tag>
            </template>
        </el-table-column>

        <el-table-column
            v-if="config.visibleColumns.includes('stats.mtgoPlayable')"
            prop="stats.mtgoPlayable"
            label="MTGO Playable"
            min-width="75"
            max-width="75"
        >
            <template #default="{ row }">
                <el-tag :type="row.stats.mtgoPlayable ? 'success' : 'danger'">
                    {{ row.stats.mtgoPlayable ? 'Yes' : 'No' }}
                </el-tag>
            </template>
        </el-table-column>

        <el-table-column
            v-if="config.visibleColumns.includes('stats.paperPlayable')"
            prop="stats.paperPlayable"
            label="Paper Playable"
            min-width="75"
            max-width="75"
        >
            <template #default="{ row }">
                <el-tag :type="row.stats.paperPlayable ? 'success' : 'danger'">
                    {{ row.stats.paperPlayable ? 'Yes' : 'No' }}
                </el-tag>
            </template>
        </el-table-column>

        <el-table-column
            v-if="config.visibleColumns.includes('stats.assumedCategories')"
            prop="stats.assumedCategories"
            label="Categories"
            min-width="75"
            max-width="100"
        >
            <template #default="{ row }">
                <div class="tag-list flex gap-2">
                    <el-tooltip
                        v-for="category in row.stats.assumedCategories"
                        :key="category"
                        :content="getCategoryTooltip(category)"
                        placement="top"
                        :hide-after="50"
                    >
                        <el-tag
                            size="small"
                            type="info"
                            :color="getCategoryTagColor(category)"
                            disable-transitions
                        >
                            {{ category }}
                        </el-tag>
                    </el-tooltip>
                </div>
            </template>
        </el-table-column>

        <el-table-column
            v-if="config.visibleColumns.includes('stats.totalMinPriceUsd')"
            prop="stats.totalMinPriceUsd"
            label="Min Price (USD)"
            min-width="75"
            max-width="100"
            sortable
            :formatter="columnFormatters.toPriceUsd"
        />

        <el-table-column
            v-if="config.visibleColumns.includes('stats.totalMinPriceTix')"
            prop="stats.totalMinPriceTix"
            label="Min Price (Tix)"
            min-width="75"
            max-width="100"
            sortable
            :formatter="columnFormatters.toFixed2"
        />

        <el-table-column
            v-if="config.visibleColumns.includes('stats.averageReleaseYear')"
            prop="stats.averageReleaseYear"
            label="Avg. Release Year"
            min-width="75"
            max-width="100"
            sortable
            :formatter="columnFormatters.roundedInteger"
        />

        <el-table-column
            v-if="config.visibleColumns.includes('stats.medianReleaseYear')"
            prop="stats.medianReleaseYear"
            label="Median Release Year"
            min-width="100"
            max-width="150"
            sortable
        >
            <template #default="{ row }">
                {{ Math.round(row.stats?.medianReleaseYear ?? 0) }} (±{{ (row.stats?.medianReleaseYearMAD ?? 0).toFixed(1) }})
            </template>
        </el-table-column>

        <el-table-column
            v-if="config.visibleColumns.includes('stats.totalCards')"
            prop="stats.totalCards"
            label="Total Cards"
            min-width="75"
            max-width="100"
            sortable
        />

        <el-table-column
            v-if="config.visibleColumns.includes('stats.newCards')"
            prop="stats.newCards"
            :sort-method="(a, b) => (a.stats.newCards / a.stats.totalCards) - (b.stats.newCards / b.stats.totalCards)"
            label="New Cards"
            min-width="75"
            max-width="100"
            sortable
        >
            <template #header>
                <el-tooltip content="Cards Released in the Last 12 Months" placement="top" :hide-after="50">
                    <span>New Cards <el-icon><InfoFilled /></el-icon></span>
                </el-tooltip>
            </template>
            <template #default="{ row }">
                <el-text class="cell-primary">{{ formatters.percentageFormatter(row.stats.newCards / row.stats.totalCards) }}</el-text>
                <el-text class="cell-secondary">({{ row.stats.newCards }})</el-text>
            </template>
        </el-table-column>

        <el-table-column
            v-if="config.visibleColumns.includes('stats.singletonCards')"
            prop="stats.singletonCards"
            :sort-method="(a, b) => (a.stats.singletonCards / a.stats.totalCards) - (b.stats.singletonCards / b.stats.totalCards)"
            label="Singleton"
            min-width="75"
            max-width="100"
            sortable
        >
            <template #header>
                <el-tooltip content="Cards with only one copy" placement="top" :hide-after="50">
                    <span>Singleton <el-icon><InfoFilled /></el-icon></span>
                </el-tooltip>
            </template>
            <template #default="{ row }">
                <el-text class="cell-primary">{{ formatters.percentageFormatter(row.stats.singletonCards / row.stats.totalCards) }}</el-text>
                <el-text class="cell-secondary">({{ row.stats.singletonCards }})</el-text>
            </template>
        </el-table-column>

        <el-table-column
            v-if="config.visibleColumns.includes('stats.landCards')"
            prop="stats.landCards"
            :sort-method="(a, b) => (a.stats.landCards / a.stats.totalCards) - (b.stats.landCards / b.stats.totalCards)"
            label="Lands"
            min-width="75"
            max-width="100"
            sortable
        >
            <template #default="{ row }">
                <el-text class="cell-primary">{{ formatters.percentageFormatter(row.stats.landCards / row.stats.totalCards) }}</el-text>
                <el-text class="cell-secondary">({{ row.stats.landCards }})</el-text>
            </template>
        </el-table-column>

        <el-table-column
            v-if="config.visibleColumns.includes('stats.creatureCards')"
            prop="stats.creatureCards"
            :sort-method="(a, b) => (a.stats.creatureCards / a.stats.totalCards) - (b.stats.creatureCards / b.stats.totalCards)"
            label="Creatures"
            min-width="75"
            max-width="100"
            sortable
        >
            <template #default="{ row }">
                <el-text class="cell-primary">{{ formatters.percentageFormatter(row.stats.creatureCards / row.stats.totalCards) }}</el-text>
                <el-text class="cell-secondary">({{ row.stats.creatureCards }})</el-text>
            </template>
        </el-table-column>

        <el-table-column
            v-if="config.visibleColumns.includes('avgSimilarityScore')"
            prop="avgSimilarityScore"
            label="Avg. Similarity"
            min-width="75"
            max-width="100"
            sortable
            :formatter="columnFormatters.percentageFormatter"
        >
            <template #header>
                <el-tooltip content="Average Cosine Similarity Score vs. Other Loaded Cubes" placement="top" :hide-after="50">
                    <span>Avg. Similarity <el-icon><InfoFilled /></el-icon></span>
                </el-tooltip>
            </template>
        </el-table-column>

        <el-table-column
            v-if="config.visibleColumns.includes('stats.averageNonLandCmc')"
            prop="stats.averageNonLandCmc"
            label="Avg. Mana Value"
            min-width="75"
            max-width="100"
            sortable
            :formatter="columnFormatters.toFixed2"
        >
            <template #header>
                <el-tooltip content="Average Mana Value of Non-Land Cards" placement="top" :hide-after="50">
                    <span>Avg. Mana Value <el-icon><InfoFilled /></el-icon></span>
                </el-tooltip>
            </template>
        </el-table-column>

        <el-table-column
            v-if="config.visibleColumns.includes('stats.averageElo')"
            prop="stats.averageElo"
            label="Avg. Elo"
            min-width="75"
            max-width="100"
            sortable
            :formatter="columnFormatters.toFixed2"
        />

        <el-table-column
            v-if="config.visibleColumns.includes('stats.averagePopularity')"
            prop="stats.averagePopularity"
            label="Avg. Popularity"
            min-width="75"
            max-width="100"
            sortable
            :formatter="columnFormatters.toPopularity"
        />

        <el-table-column
            v-if="config.visibleColumns.includes('stats.blendedRarityScore')"
            prop="stats.blendedRarityScore"
            label="Rarity Score"
            min-width="75"
            max-width="100"
            sortable
            :formatter="columnFormatters.toFixed2"
        >
            <template #header>
                <el-tooltip content="Card Minimum Rarity Score, using C=0.333, U=0.666, R=1.000, M=1.200" placement="top" :hide-after="50">
                    <span>Rarity Score <el-icon><InfoFilled /></el-icon></span>
                </el-tooltip>
            </template>
        </el-table-column>

        <el-table-column
            v-if="config.visibleColumns.includes('stats.averageWordCount')"
            prop="stats.averageWordCount"
            label="Avg. Word Count"
            min-width="75"
            max-width="100"
            sortable
            :formatter="columnFormatters.toFixed2"
        />

        <el-table-column
            v-if="config.visibleColumns.includes('stats.averageWordCountUnique')"
            prop="stats.averageWordCountUnique"
            label="Avg. Word Count (Unique)"
            min-width="75"
            max-width="100"
            sortable
            :formatter="columnFormatters.toFixed2"
        />

        <el-table-column
            v-if="config.visibleColumns.includes('stats.uniqueKeywords')"
            prop="stats.uniqueKeywords"
            label="Keywords"
            min-width="75"
            max-width="100"
            sortable
        />

        <el-table-column
            v-if="config.visibleColumns.includes('stats.uniqueNonEvergreenKeywords')"
            prop="stats.uniqueNonEvergreenKeywords"
            label="Non-Evergreen Keywords"
            min-width="75"
            max-width="100"
            sortable
        />

        <el-table-column
            v-if="config.visibleColumns.includes('stats.cardCounts.abnormalLayout')"
            prop="stats.cardCounts.abnormalLayout"
            :sort-method="(a, b) => (a.stats.cardCounts.abnormalLayout / a.stats.totalCards) - (b.stats.cardCounts.abnormalLayout / b.stats.totalCards)"
            label="Abnormal Layout"
            min-width="75"
            max-width="100"
            sortable
        >
            <template #header>
                <el-tooltip content="Cards with Abnormal Layouts (e.g. Split, Flip, MDFCs, etc.)" placement="top" :hide-after="50">
                    <span>Abnormal Layout <el-icon><InfoFilled /></el-icon></span>
                </el-tooltip>
            </template>
            <template #default="{ row }">
                <el-text class="cell-primary">{{ formatters.percentageFormatter(row.stats.cardCounts.abnormalLayout / row.stats.totalCards) }}</el-text>
                <el-text class="cell-secondary">({{ row.stats.cardCounts.abnormalLayout }})</el-text>
            </template>
        </el-table-column>

        <el-table-column
            v-if="config.visibleColumns.includes('stats.cardCounts.makesTokens')"
            prop="stats.cardCounts.makesTokens"
            :sort-method="(a, b) => (a.stats.cardCounts.makesTokens / a.stats.totalCards) - (b.stats.cardCounts.makesTokens / b.stats.totalCards)"
            label="Makes Tokens"
            min-width="75"
            max-width="100"
            sortable
        >
            <template #default="{ row }">
                <el-text class="cell-primary">{{ formatters.percentageFormatter(row.stats.cardCounts.makesTokens / row.stats.totalCards) }}</el-text>
                <el-text class="cell-secondary">({{ row.stats.cardCounts.makesTokens }})</el-text>
            </template>
        </el-table-column>

        <el-table-column
            v-if="config.visibleColumns.includes('stats.cardCounts.removal')"
            prop="stats.cardCounts.removal"
            :sort-method="(a, b) => (a.stats.cardCounts.removal / a.stats.totalCards) - (b.stats.cardCounts.removal / b.stats.totalCards)"
            label="Removal"
            min-width="75"
            max-width="100"
            sortable
        >
            <template #default="{ row }">
                <el-text class="cell-primary">{{ formatters.percentageFormatter(row.stats.cardCounts.removal / row.stats.totalCards) }}</el-text>
                <el-text class="cell-secondary">({{ row.stats.cardCounts.removal }})</el-text>
            </template>
        </el-table-column>

        <el-table-column
            v-if="config.visibleColumns.includes('stats.cardCounts.universesBeyond')"
            prop="stats.cardCounts.universesBeyond"
            :sort-method="(a, b) => (a.stats.cardCounts.universesBeyond / a.stats.totalCards) - (b.stats.cardCounts.universesBeyond / b.stats.totalCards)"
            label="Universes Beyond"
            min-width="75"
            max-width="100"
            sortable
        >
            <template #header>
                <el-tooltip content="Cards originally from Universes Beyond Products (includes Standard sets)" placement="top" :hide-after="50">
                    <span>Universes Beyond <el-icon><InfoFilled /></el-icon></span>
                </el-tooltip>
            </template>
            <template #default="{ row }">
                <el-text class="cell-primary">{{ formatters.percentageFormatter(row.stats.cardCounts.universesBeyond / row.stats.totalCards) }}</el-text>
                <el-text class="cell-secondary">({{ row.stats.cardCounts.universesBeyond }})</el-text>
            </template>
        </el-table-column>

        <el-table-column
            v-if="config.visibleColumns.includes('stats.cardCounts.supplementalProduct')"
            prop="stats.cardCounts.supplementalProduct"
            :sort-method="(a, b) => (a.stats.cardCounts.supplementalProduct / a.stats.totalCards) - (b.stats.cardCounts.supplementalProduct / b.stats.totalCards)"
            label="Supplemental Product"
            min-width="75"
            max-width="100"
            sortable
        >
            <template #header>
                <el-tooltip content="Cards originally from Supplemental Products (includes Portal)" placement="top" :hide-after="50">
                    <span>Supplemental Product <el-icon><InfoFilled /></el-icon></span>
                </el-tooltip>
            </template>
            <template #default="{ row }">
                <el-text class="cell-primary">{{ formatters.percentageFormatter(row.stats.cardCounts.supplementalProduct / row.stats.totalCards) }}</el-text>
                <el-text class="cell-secondary">({{ row.stats.cardCounts.supplementalProduct }})</el-text>
            </template>
        </el-table-column>
    </el-table>
</template>

<script setup lang="ts">
import { ref, reactive, computed, inject } from 'vue';
import { getNestedProp, castInensitiveSort } from '../util/HelperFunctions';
import { bindStorage } from '../util/VueLocalStorage';
import { useDateFormat } from '@vueuse/core';
import { Delete, WarnTriangleFilled, InfoFilled } from '@element-plus/icons-vue';

const props = defineProps({
    loadedCubes: {
        type: Object,
        required: true,
    },
    overviewTableData: {
        type: Array,
        required: true,
    },
    similarityMatrix: {
        type: Object,
        required: true,
    },
    presetComparisonsSelect: {
        type: Array,
        required: true,
    },
    addCube: {
        type: Function,
        required: true,
    },
    removeCube: {
        type: Function,
        required: true,
    },
    loadCollection: {
        type: Function,
        required: true,
    },
});

const defaultConfig = {
    visibleColumns: [
        'rowNumber',
        'name',
        'owner',
        'stats.totalCards',
        'stats.newCards',
        'avgSimilarityScore',
        'stats.averageNonLandCmc',
        'stats.averageWordCountUnique',
        'stats.cardCounts.removal',
        'stats.uniqueNonEvergreenKeywords',
    ],
};

const config = bindStorage('cube-app-config', (v) => {
    if (v == undefined || v === null) {
        return defaultConfig;
    } else {
        return {
            visibleColumns: Array.isArray(v.visibleColumns) ? v.visibleColumns : defaultConfig.visibleColumns,
        }
    }
});

const columnCustomizationVisible = ref(false);

const addCubeForm = reactive({
    loading: false,
    cubeId: '',
    presetComparisonsSelection: '',
});

const openCubeDetailDialog = inject('openCubeDetailDialog');

const submitAddCubeForm = async () => {
    addCubeForm.loading = true;
    await props.addCube(addCubeForm.cubeId);
    addCubeForm.cubeId = '';
    addCubeForm.loading = false;
};

const handleLoadPreset = async (presetName: string) => {
    addCubeForm.loading = true;
    await props.loadCollection(presetName);
    addCubeForm.loading = false;
    addCubeForm.presetComparisonsSelection = '';
};

const removeCube = (cubeId: string) => {
    props.removeCube(cubeId);
};

const columnOptions = ref([
    {
        label: 'Core',
        options: [
            { value: 'rowNumber', label: "Row Number" },
            { value: 'name', label: "Name" },
            { value: 'owner', label: "Owner" },
            { value: 'lastModified', label: "Last Modified", tooltip: "Date when the contents or description of the cube was last modified" },
            { value: 'followerCount', label: "Followers", tooltip: "Number of users following the cube on CubeCobra" },
            { value: 'stats.arenaPlayable', label: "Arena Playable", tooltip: "Whether the cube is playable on MTG Arena" },
            { value: 'stats.mtgoPlayable', label: "MTGO Playable", tooltip: "Whether the cube is playable on MTGO" },
            { value: 'stats.paperPlayable', label: "Paper Playable", tooltip: "Whether the cube is playable in Paper (no Digital-only printings, no Custom cards)" },
            { value: 'stats.assumedCategories', label: "Categories", tooltip: "Assumed Categorization of the cube based on its contents (pauper, peasant, powered, desert)" },
            { value: 'stats.totalMinPriceUsd', label: "Min Price (USD)", tooltip: "Total Minimum Price of the Cube in USD" },
            { value: 'stats.totalMinPriceTix', label: "Min Price (Tix)", tooltip: "Total Minimum Price of the Cube in MTGO Tix" },
            { value: 'stats.averageReleaseYear', label: 'Avg. Release Year', tooltip: "Average Release Year of Cards in the Cube" },
            { value: 'stats.medianReleaseYear', label: 'Median Release Year', tooltip: "Median Release Year of Cards in the Cube (± Median Absolute Deviation)" },
            { value: 'stats.totalCards', label: "Total Cards", tooltip: "Total Number of Cards" },
            { value: 'stats.newCards', label: "New Cards", tooltip: "Cards Released in the Last 12 Months" },
            { value: 'stats.singletonCards', label: "Singleton", tooltip: "Cards with only one copy" },
            { value: 'stats.landCards', label: "Lands", tooltip: "Cards that are playable from hand as a Land, includes MDFCs" },
            { value: 'stats.creatureCards', label: "Creatures", tooltip: "Cards with 'Creature' in their Type Line" },
        ],
    },
    {
        label: 'Summary Stats',
        options: [
            { value: 'avgSimilarityScore', label: "Avg. Similarity", tooltip: "Average Cosine Similarity Score vs. Other Loaded Cubes" },
            { value: 'stats.averageNonLandCmc', label: "Avg. Mana Value", tooltip: "Average Mana Value of Non-Land Cards" },
            { value: 'stats.averageElo', label: "Avg. Card Elo", tooltip: "Average CubeCobra Card Elo Rating" },
            { value: 'stats.averagePopularity', label: "Avg. Card Popularity", tooltip: "Average CubeCobra Card Popularity Score" },
            { value: 'stats.blendedRarityScore', label: "Rarity Score", tooltip: "Card Minimum Rarity Score, using C=0.333, U=0.666, R=1.000, M=1.200" },
        ],
    },
    {
        label: 'Characteristics',
        options: [
            { value: 'stats.averageWordCount', label: 'Avg. Word Count', tooltip: "Average Oracle Text Word Count, excluding Reminder Text" },
            { value: 'stats.averageWordCountUnique', label: 'Avg. Word Count (Unique)', tooltip: "Average Oracle Text Word Count of Unique Cards, excluding Reminder Text" },
            { value: 'stats.uniqueKeywords', label: "Keywords", tooltip: "Number of Unique Keywords" },
            { value: 'stats.uniqueNonEvergreenKeywords', label: "Non-Evergreen Keywords", tooltip: "Number of Unique Non-Evergreen Keywords" },
            { value: 'stats.cardCounts.abnormalLayout', label: "Abnormal Layout", tooltip: "Cards with Abnormal Layouts (e.g. Split, Flip, MDFCs, etc.)" },
            { value: 'stats.cardCounts.makesTokens', label: "Makes Tokens", tooltip: "Cards that Create one or more Tokens" },
            { value: 'stats.cardCounts.removal', label: "Removal", tooltip: "Cards tagged as \"removal\" in Scryfall's Tagger" },
        ],
    },
    {
        label: 'Product Line',
        options: [
            { value: 'stats.cardCounts.universesBeyond', label: "Universes Beyond", tooltip: "Cards originally from Universes Beyond Products (includes Standard sets)" },
            { value: 'stats.cardCounts.supplementalProduct', label: "Supplemental Product", tooltip: "Cards originally from Supplemental Products (includes Portal)" },
        ],
    },
]);

const categories = [
    { text: 'pauper', value: 'pauper', color: 'rgba(255, 165, 0, 0.2)', tooltip: 'All cards are commons.' },
    { text: 'pauper+', value: 'pauper+', color: 'rgba(0, 255, 115, 0.2)', tooltip: 'All non-land cards are commons.' },
    { text: 'pauper-ish', value: 'pauper-ish', color: 'rgba(95, 95, 235, 0.2)', tooltip: '≥92.5% of non-land cards are commons; no uncommon/rare lands.' },
    { text: 'pauper+ish', value: 'pauper+ish', color: 'rgba(95, 235, 95, 0.2)', tooltip: '≥92.5% of non-land cards are commons; contains uncommon/rare lands.' },
    { text: 'peasant', value: 'peasant', color: 'rgba(0, 128, 0, 0.2)', tooltip: 'All cards are common or uncommon.' },
    { text: 'peasant+', value: 'peasant+', color: 'rgba(34, 145, 169, 0.2)', tooltip: 'All non-land cards are common or uncommon.' },
    { text: 'peasant-ish', value: 'peasant-ish', color: 'rgba(128, 0, 128, 0.2)', tooltip: '≥92.5% of non-land cards are common or uncommon; no rare lands.' },
    { text: 'peasant+ish', value: 'peasant+ish', color: 'rgba(128, 128, 0, 0.2)', tooltip: '≥92.5% of non-land cards are common or uncommon; contains rare lands.' },
    { text: 'powered', value: 'powered', color: 'rgba(128, 0, 20, 0.2)', tooltip: 'Contains one or more pieces of the Power 9.' },
    { text: 'desert?', value: 'desert?', color: 'rgba(169, 150, 35, 0.2)', tooltip: 'Contains more than 28% lands.' },
];

const getCategoryTagColor = (category: string) => {
    return categories.find(c => c.value.toLowerCase() === category?.toLowerCase())?.color ?? 'rgba(200, 200, 200, 0.3)';
};

const getCategoryTooltip = (category: string) => {
    return categories.find(c => c.value.toLowerCase() === category?.toLowerCase())?.tooltip ?? '';
};

const sortMethods = {
    caseInsensitiveName: (a, b) => {
        return castInensitiveSort(a.name, b.name);
    },
    caseInsensitiveOwner: (a, b) => {
        return castInensitiveSort(a.owner, b.owner);
    },
};

const formatters = {
    percentageFormatter: (value: number) => {
        return (value * 100).toFixed(2) + '%';
    },
};

const columnFormatters = {
    roundedInteger: (row, column) => {
        return Math.round(getNestedProp(row, column.property) ?? 0);
    },
    toFixed2: (row, column) => {
        return (getNestedProp(row, column.property) ?? 0).toFixed(2);
    },
    toPopularity: (row, column) => {
        return (getNestedProp(row, column.property) ?? 0).toFixed(2) + ' %';
    },
    toPriceUsd: (row, column) => {
        return '$' + (getNestedProp(row, column.property) ?? 0).toFixed(2);
    },
    percentageFormatter: (row, column) => {
        return ((getNestedProp(row, column.property) ?? 0) * 100).toFixed(2) + '%';
    },
    toDate: (row, column) => {
        const unixTimestamp = getNestedProp(row, column.property);
        if (unixTimestamp === undefined || unixTimestamp === null) {
            return 'N/A';
        }

        return useDateFormat(new Date(unixTimestamp), 'YYYY-MM-DD').value;
    },
};
</script>
