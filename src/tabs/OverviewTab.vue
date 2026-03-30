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

    <el-dialog
        v-model="saveDialogVisible"
        title="Save Collection"
        width="400"
        align-center
        destroy-on-close
    >
        <el-input
            v-model="saveDialogName"
            placeholder="Collection name"
            maxlength="60"
            show-word-limit
            @keyup.enter="handleSaveCollection"
        />
        <template #footer>
            <el-button @click="saveDialogVisible = false">Cancel</el-button>
            <el-button type="primary" :disabled="!saveDialogName.trim()" @click="handleSaveCollection">Save</el-button>
        </template>
    </el-dialog>

    <el-dialog
        v-model="removeDialogVisible"
        title="Remove Collection"
        width="400"
        align-center
        destroy-on-close
    >
        <el-empty v-if="props.userCollections.length === 0" description="No saved collections" :image-size="60" />
        <ul v-else class="collection-remove-list">
            <li v-for="col in props.userCollections" :key="col.name" class="collection-remove-item">
                <span>{{ col.name }}</span>
                <el-button link type="danger" @click="handleRemoveCollection(col.name)">
                    <el-icon><Delete /></el-icon>
                </el-button>
            </li>
        </ul>
        <template #footer>
            <el-button @click="removeDialogVisible = false">Close</el-button>
        </template>
    </el-dialog>

    <el-row>
        <el-col :span="18" :xs="24" :sm="24" :md="18" :lg="18">
            <el-form :model="addCubeForm" :inline="true" @submit.prevent="submitAddCubeForm" v-loading="addCubeForm.loading">
                <el-form-item>
                    <el-col :span="11" :xs="24" :sm="24" :md="11" :lg="11">
                        <el-form-item style="min-width: 200px; width: 100%;">
                            <el-select label="Collections" v-model="addCubeForm.presetComparisonsSelection" @change="handleCollectionSelect" placeholder="Load Collection...">
                                <template #footer>
                                    <div class="collection-select-header">
                                        <el-button
                                            text
                                            bg
                                            type="success"
                                            size="small"
                                            :disabled="Object.keys(props.loadedCubes).length === 0"
                                            @click.stop="openSaveDialog"
                                        >Save As...</el-button>
                                        <el-divider direction="vertical" />
                                        <el-button
                                            text
                                            bg
                                            type="danger"
                                            size="small"
                                            :disabled="props.userCollections.length === 0"
                                            @click.stop="openRemoveDialog"
                                        >Remove...</el-button>
                                    </div>
                                </template>
                                <el-option-group v-if="props.userCollections.length > 0" label="My Collections">
                                    <el-option
                                        v-for="col in props.userCollections"
                                        :key="col.name"
                                        :label="col.name"
                                        :value="'__user__:' + col.name"
                                    />
                                </el-option-group>
                                <el-option-group label="Presets">
                                    <el-option
                                        v-for="option in presetComparisonsSelect"
                                        :key="option.value"
                                        :label="option.label"
                                        :value="option.value"
                                    />
                                </el-option-group>
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

    <StickyTable
        :data="sortedData"
        :columns="tableColumns"
        :default-sort="{ prop: 'name', order: 'ascending' }"
        @sort-change="onSortChange"
        stripe
    >
        <template #cell-thumbnail="{ row }">
            <el-image :src="row.thumbnail" class="remove-thumbnail" fit="contain" style="width: 50px; height: 35px;" />
            <el-button class="remove-button" size="small" type="danger" @click="removeCube(row.id)">
                <el-icon><Delete /></el-icon>
            </el-button>
        </template>

        <template #cell-rowNumber="{ rowIndex }">
            {{ rowIndex + 1 }}
        </template>

        <template #cell-name="{ row }">
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

        <template #cell-owner="{ row }">
            <el-link :href="`https://cubecobra.com/user/view/${row.ownerId}`" target="_blank">{{ row.owner }}</el-link>
        </template>

        <template #cell-arenaPlayable="{ row }">
            <el-tag :type="row.stats.arenaPlayable ? 'success' : 'danger'">
                {{ row.stats.arenaPlayable ? 'Yes' : 'No' }}
            </el-tag>
        </template>

        <template #cell-mtgoPlayable="{ row }">
            <el-tag :type="row.stats.mtgoPlayable ? 'success' : 'danger'">
                {{ row.stats.mtgoPlayable ? 'Yes' : 'No' }}
            </el-tag>
        </template>

        <template #cell-paperPlayable="{ row }">
            <el-tag :type="row.stats.paperPlayable ? 'success' : 'danger'">
                {{ row.stats.paperPlayable ? 'Yes' : 'No' }}
            </el-tag>
        </template>

        <template #cell-assumedCategories="{ row }">
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

        <template #cell-averageReleaseYear="{ row }">
            {{ Math.round(row.stats?.averageReleaseYear ?? 0) }} (±{{ (row.stats?.averageReleaseYearStdDev ?? 0).toFixed(1) }})
        </template>

        <template #cell-medianReleaseYear="{ row }">
            {{ Math.round(row.stats?.medianReleaseYear ?? 0) }} (±{{ (row.stats?.medianReleaseYearMAD ?? 0).toFixed(1) }})
        </template>

        <template #cell-totalUniqueCards="{ row }">
            <el-text class="cell-primary">{{ formatters.percentageFormatter(row.stats.totalUniqueCards / row.stats.totalCards) }}</el-text>
            <el-text class="cell-secondary">({{ row.stats.totalUniqueCards }})</el-text>
        </template>

        <template #cell-newCards="{ row }">
            <el-text class="cell-primary">{{ formatters.percentageFormatter(row.stats.newCards / row.stats.totalCards) }}</el-text>
            <el-text class="cell-secondary">({{ row.stats.newCards }})</el-text>
        </template>

        <template #cell-landCards="{ row }">
            <el-text class="cell-primary">{{ formatters.percentageFormatter(row.stats.landCards / row.stats.totalCards) }}</el-text>
            <el-text class="cell-secondary">({{ row.stats.landCards }})</el-text>
        </template>

        <template #cell-creatureCards="{ row }">
            <el-text class="cell-primary">{{ formatters.percentageFormatter(row.stats.creatureCards / row.stats.totalCards) }}</el-text>
            <el-text class="cell-secondary">({{ row.stats.creatureCards }})</el-text>
        </template>

        <template #cell-abnormalLayout="{ row }">
            <el-text class="cell-primary">{{ formatters.percentageFormatter(row.stats.cardCounts.abnormalLayout / row.stats.totalCards) }}</el-text>
            <el-text class="cell-secondary">({{ row.stats.cardCounts.abnormalLayout }})</el-text>
        </template>

        <template #cell-makesTokens="{ row }">
            <el-text class="cell-primary">{{ formatters.percentageFormatter(row.stats.cardCounts.makesTokens / row.stats.totalCards) }}</el-text>
            <el-text class="cell-secondary">({{ row.stats.cardCounts.makesTokens }})</el-text>
        </template>

        <template #cell-uniqueTokenCount="{ row }">
            <el-text class="cell-primary">{{ row.stats.uniqueTokenCount }}</el-text>
        </template>

        <template #cell-removal="{ row }">
            <el-text class="cell-primary">{{ formatters.percentageFormatter(row.stats.cardCounts.removal / row.stats.totalCards) }}</el-text>
            <el-text class="cell-secondary">({{ row.stats.cardCounts.removal }})</el-text>
        </template>

        <template #cell-universesBeyond="{ row }">
            <el-text class="cell-primary">{{ formatters.percentageFormatter(row.stats.cardCounts.universesBeyond / row.stats.totalCards) }}</el-text>
            <el-text class="cell-secondary">({{ row.stats.cardCounts.universesBeyond }})</el-text>
        </template>

        <template #cell-supplementalProduct="{ row }">
            <el-text class="cell-primary">{{ formatters.percentageFormatter(row.stats.cardCounts.supplementalProduct / row.stats.totalCards) }}</el-text>
            <el-text class="cell-secondary">({{ row.stats.cardCounts.supplementalProduct }})</el-text>
        </template>
    </StickyTable>
</template>

<script setup lang="ts">
import { ref, reactive, computed, inject } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { getNestedProp, castInensitiveSort } from '../util/HelperFunctions';
import { bindStorage } from '../util/VueLocalStorage';
import { useDateFormat } from '@vueuse/core';
import { Delete, WarnTriangleFilled, InfoFilled } from '@element-plus/icons-vue';
import type { UserCollection } from '../types';
import StickyTable from '../components/StickyTable.vue';
import type { StickyTableColumn } from '../types/StickyTableColumn';

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
    userCollections: {
        type: Array as () => UserCollection[],
        default: () => [],
    },
    saveCollection: {
        type: Function as unknown as () => (name: string) => void,
        default: null,
    },
    loadUserCollection: {
        type: Function as unknown as () => (name: string) => Promise<void>,
        default: null,
    },
    removeCollection: {
        type: Function as unknown as () => (name: string) => void,
        default: null,
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

const handleCollectionSelect = async (value: string) => {
    addCubeForm.loading = true;
    if (value.startsWith('__user__:')) {
        const name = value.slice('__user__:'.length);
        await props.loadUserCollection(name);
    } else {
        await props.loadCollection(value);
    }
    addCubeForm.loading = false;
    addCubeForm.presetComparisonsSelection = '';
};

// Save collection dialog
const saveDialogVisible = ref(false);
const saveDialogName = ref('');

const openSaveDialog = () => {
    saveDialogName.value = '';
    saveDialogVisible.value = true;
};

const handleSaveCollection = async () => {
    const name = saveDialogName.value.trim();
    if (!name) return;
    const exists = props.userCollections.some((c: UserCollection) => c.name === name);
    if (exists) {
        try {
            await ElMessageBox.confirm(
                `A collection named "${name}" already exists. Overwrite it?`,
                'Overwrite Collection',
                { type: 'warning', confirmButtonText: 'Overwrite', cancelButtonText: 'Cancel' },
            );
        } catch {
            return;
        }
    }
    props.saveCollection(name);
    saveDialogVisible.value = false;
    saveDialogName.value = '';
    ElMessage({ type: 'success', message: `Collection "${name}" saved.` });
};

// Remove collection dialog
const removeDialogVisible = ref(false);

const openRemoveDialog = () => {
    removeDialogVisible.value = true;
};

const handleRemoveCollection = async (name: string) => {
    try {
        await ElMessageBox.confirm(
            `Delete collection "${name}"? This cannot be undone.`,
            'Remove Collection',
            { type: 'warning', confirmButtonText: 'Delete', cancelButtonText: 'Cancel' },
        );
    } catch {
        return;
    }
    props.removeCollection(name);
    if (props.userCollections.length === 0) {
        removeDialogVisible.value = false;
    }
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
            { value: 'stats.averageReleaseYear', label: 'Avg. Release Year', tooltip: "Average Release Year of Cards in the Cube (± Standard Deviation)" },
            { value: 'stats.medianReleaseYear', label: 'Median Release Year', tooltip: "Median Release Year of Cards in the Cube (± Median Absolute Deviation)" },
            { value: 'stats.totalCards', label: "Total Cards", tooltip: "Total Number of Cards" },
            { value: 'stats.newCards', label: "New Cards", tooltip: "Cards Released in the Last 12 Months" },
            { value: 'stats.totalUniqueCards', label: "Unique Cards", tooltip: "Number of unique cards by oracle ID" },
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
            { value: 'stats.uniqueTokenCount', label: "Unique Tokens", tooltip: "Number of unique tokens produced by cards in the cube" },
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
    caseInsensitiveName: (a: any, b: any) => {
        return castInensitiveSort(a.name, b.name);
    },
    caseInsensitiveOwner: (a: any, b: any) => {
        return castInensitiveSort(a.owner, b.owner);
    },
    ratioSort: (propPath: string) => (a: any, b: any) => {
        return (getNestedProp(a, propPath) / a.stats.totalCards) - (getNestedProp(b, propPath) / b.stats.totalCards);
    },
};

// --- Sort state ---
const activeSort = ref<{ prop: string; order: 'ascending' | 'descending' | null }>({ prop: 'name', order: 'ascending' });

const onSortChange = (sortInfo: { prop: string; order: 'ascending' | 'descending' | null }) => {
    activeSort.value = sortInfo;
};

// --- Formatter helpers ---
const fmtFixed2 = (prop: string) => (row: any) => (getNestedProp(row, prop) ?? 0).toFixed(2);
const fmtPriceUsd = (prop: string) => (row: any) => '$' + (getNestedProp(row, prop) ?? 0).toFixed(2);
const fmtPopularity = (prop: string) => (row: any) => (getNestedProp(row, prop) ?? 0).toFixed(2) + ' %';
const fmtPercentage = (prop: string) => (row: any) => ((getNestedProp(row, prop) ?? 0) * 100).toFixed(2) + '%';
const fmtDate = (prop: string) => (row: any) => {
    const ts = getNestedProp(row, prop);
    if (!ts) return 'N/A';
    return useDateFormat(new Date(ts), 'YYYY-MM-DD').value;
};

// --- Table column definitions ---
const tableColumns = computed<StickyTableColumn[]>(() => [
    { key: 'thumbnail', label: '', width: '75px' },
    { key: 'rowNumber', label: '#', width: '50px', visible: config.value.visibleColumns.includes('rowNumber') },
    { key: 'name', prop: 'name', label: 'Name', minWidth: '120px', maxWidth: '240px', showOverflowTooltip: true, sortable: true, sortMethod: sortMethods.caseInsensitiveName, visible: config.value.visibleColumns.includes('name') },
    { key: 'owner', prop: 'owner', label: 'Owner', minWidth: '90px', maxWidth: '160px', showOverflowTooltip: true, sortable: true, sortMethod: sortMethods.caseInsensitiveOwner, visible: config.value.visibleColumns.includes('owner') },
    { key: 'lastModified', prop: 'lastModified', label: 'Modified', minWidth: '90px', sortable: true, formatter: fmtDate('lastModified'), tooltip: 'Date the cube was last modified', visible: config.value.visibleColumns.includes('lastModified') },
    { key: 'followerCount', prop: 'followerCount', label: 'Followers', minWidth: '80px', sortable: true, visible: config.value.visibleColumns.includes('followerCount') },
    { key: 'arenaPlayable', prop: 'stats.arenaPlayable', label: 'Arena', minWidth: '65px', tooltip: 'Arena Playable — all cards available on MTG Arena', visible: config.value.visibleColumns.includes('stats.arenaPlayable') },
    { key: 'mtgoPlayable', prop: 'stats.mtgoPlayable', label: 'MTGO', minWidth: '65px', tooltip: 'MTGO Playable — all cards available on Magic Online', visible: config.value.visibleColumns.includes('stats.mtgoPlayable') },
    { key: 'paperPlayable', prop: 'stats.paperPlayable', label: 'Paper', minWidth: '65px', tooltip: 'Paper Playable — no digital-only printings or custom cards', visible: config.value.visibleColumns.includes('stats.paperPlayable') },
    { key: 'assumedCategories', prop: 'stats.assumedCategories', label: 'Categories', minWidth: '75px', visible: config.value.visibleColumns.includes('stats.assumedCategories') },
    { key: 'totalMinPriceUsd', prop: 'stats.totalMinPriceUsd', label: 'Price (USD)', minWidth: '80px', sortable: true, formatter: fmtPriceUsd('stats.totalMinPriceUsd'), tooltip: 'Total minimum price of the cube in USD', visible: config.value.visibleColumns.includes('stats.totalMinPriceUsd') },
    { key: 'totalMinPriceTix', prop: 'stats.totalMinPriceTix', label: 'Price (Tix)', minWidth: '80px', sortable: true, formatter: fmtFixed2('stats.totalMinPriceTix'), tooltip: 'Total minimum price of the cube in MTGO Tix', visible: config.value.visibleColumns.includes('stats.totalMinPriceTix') },
    { key: 'averageReleaseYear', prop: 'stats.averageReleaseYear', label: 'Avg. Year', minWidth: '85px', sortable: true, tooltip: 'Average release year of cards in the cube (± Standard Deviation)', visible: config.value.visibleColumns.includes('stats.averageReleaseYear') },
    { key: 'medianReleaseYear', prop: 'stats.medianReleaseYear', label: 'Med. Year', minWidth: '85px', sortable: true, tooltip: 'Median release year of cards in the cube (± Median Absolute Deviation)', visible: config.value.visibleColumns.includes('stats.medianReleaseYear') },
    { key: 'totalCards', prop: 'stats.totalCards', label: 'Cards', minWidth: '65px', sortable: true, tooltip: 'Total number of cards', visible: config.value.visibleColumns.includes('stats.totalCards') },
    { key: 'totalUniqueCards', prop: 'stats.totalUniqueCards', label: 'Unique', minWidth: '75px', sortable: true, sortMethod: sortMethods.ratioSort('stats.totalUniqueCards'), tooltip: 'Number of unique cards by oracle ID', visible: config.value.visibleColumns.includes('stats.totalUniqueCards') },
    { key: 'newCards', prop: 'stats.newCards', label: 'New', minWidth: '65px', sortable: true, sortMethod: sortMethods.ratioSort('stats.newCards'), tooltip: 'Cards Released in the Last 12 Months', visible: config.value.visibleColumns.includes('stats.newCards') },
    { key: 'landCards', prop: 'stats.landCards', label: 'Lands', minWidth: '65px', sortable: true, sortMethod: sortMethods.ratioSort('stats.landCards'), visible: config.value.visibleColumns.includes('stats.landCards') },
    { key: 'creatureCards', prop: 'stats.creatureCards', label: 'Creatures', minWidth: '75px', sortable: true, sortMethod: sortMethods.ratioSort('stats.creatureCards'), visible: config.value.visibleColumns.includes('stats.creatureCards') },
    { key: 'avgSimilarityScore', prop: 'avgSimilarityScore', label: 'Similarity', minWidth: '75px', sortable: true, formatter: fmtPercentage('avgSimilarityScore'), tooltip: 'Average Cosine Similarity Score vs. Other Loaded Cubes', visible: config.value.visibleColumns.includes('avgSimilarityScore') },
    { key: 'averageNonLandCmc', prop: 'stats.averageNonLandCmc', label: 'Avg. MV', minWidth: '70px', sortable: true, formatter: fmtFixed2('stats.averageNonLandCmc'), tooltip: 'Average Mana Value of Non-Land Cards', visible: config.value.visibleColumns.includes('stats.averageNonLandCmc') },
    { key: 'averageElo', prop: 'stats.averageElo', label: 'Avg. Elo', minWidth: '70px', sortable: true, formatter: fmtFixed2('stats.averageElo'), tooltip: 'Average CubeCobra Elo Rating', visible: config.value.visibleColumns.includes('stats.averageElo') },
    { key: 'averagePopularity', prop: 'stats.averagePopularity', label: 'Avg. Pop.', minWidth: '70px', sortable: true, formatter: fmtPopularity('stats.averagePopularity'), tooltip: 'Average CubeCobra Card Popularity %', visible: config.value.visibleColumns.includes('stats.averagePopularity') },
    { key: 'blendedRarityScore', prop: 'stats.blendedRarityScore', label: 'Rarity', minWidth: '65px', sortable: true, formatter: fmtFixed2('stats.blendedRarityScore'), tooltip: 'Blended Rarity Score — minimum rarity per card, C=0.333, U=0.666, R=1.000, M=1.200', visible: config.value.visibleColumns.includes('stats.blendedRarityScore') },
    { key: 'averageWordCount', prop: 'stats.averageWordCount', label: 'Avg. Words', minWidth: '75px', sortable: true, formatter: fmtFixed2('stats.averageWordCount'), tooltip: 'Average Oracle Text Word Count (excluding Reminder Text)', visible: config.value.visibleColumns.includes('stats.averageWordCount') },
    { key: 'averageWordCountUnique', prop: 'stats.averageWordCountUnique', label: 'Avg. Words*', minWidth: '80px', sortable: true, formatter: fmtFixed2('stats.averageWordCountUnique'), tooltip: 'Average Oracle Text Word Count of Unique Cards (excluding Reminder Text)', visible: config.value.visibleColumns.includes('stats.averageWordCountUnique') },
    { key: 'uniqueKeywords', prop: 'stats.uniqueKeywords', label: 'Keywords', minWidth: '75px', sortable: true, tooltip: 'Number of unique keywords', visible: config.value.visibleColumns.includes('stats.uniqueKeywords') },
    { key: 'uniqueNonEvergreenKeywords', prop: 'stats.uniqueNonEvergreenKeywords', label: 'Non-EG KW', minWidth: '80px', sortable: true, tooltip: 'Number of unique non-evergreen keywords', visible: config.value.visibleColumns.includes('stats.uniqueNonEvergreenKeywords') },
    { key: 'abnormalLayout', prop: 'stats.cardCounts.abnormalLayout', label: 'Abn. Layout', minWidth: '80px', sortable: true, sortMethod: sortMethods.ratioSort('stats.cardCounts.abnormalLayout'), tooltip: 'Cards with Abnormal Layouts (e.g. Split, Flip, MDFCs, etc.)', visible: config.value.visibleColumns.includes('stats.cardCounts.abnormalLayout') },
    { key: 'makesTokens', prop: 'stats.cardCounts.makesTokens', label: 'Tokens', minWidth: '65px', sortable: true, sortMethod: sortMethods.ratioSort('stats.cardCounts.makesTokens'), tooltip: 'Cards that create one or more tokens', visible: config.value.visibleColumns.includes('stats.cardCounts.makesTokens') },
    { key: 'uniqueTokenCount', prop: 'stats.uniqueTokenCount', label: 'Uniq. Tokens', minWidth: '80px', sortable: true, tooltip: 'Number of unique tokens produced by cards in the cube', visible: config.value.visibleColumns.includes('stats.uniqueTokenCount') },
    { key: 'removal', prop: 'stats.cardCounts.removal', label: 'Removal', minWidth: '70px', sortable: true, sortMethod: sortMethods.ratioSort('stats.cardCounts.removal'), tooltip: "Cards tagged as 'removal' in Scryfall's Tagger", visible: config.value.visibleColumns.includes('stats.cardCounts.removal') },
    { key: 'universesBeyond', prop: 'stats.cardCounts.universesBeyond', label: 'UB', minWidth: '55px', sortable: true, sortMethod: sortMethods.ratioSort('stats.cardCounts.universesBeyond'), tooltip: 'Universes Beyond — cards originally from non-Magic IP products (includes Standard sets)', visible: config.value.visibleColumns.includes('stats.cardCounts.universesBeyond') },
    { key: 'supplementalProduct', prop: 'stats.cardCounts.supplementalProduct', label: 'Supp.', minWidth: '60px', sortable: true, sortMethod: sortMethods.ratioSort('stats.cardCounts.supplementalProduct'), tooltip: 'Supplemental Product — cards originally from supplemental products (includes Portal)', visible: config.value.visibleColumns.includes('stats.cardCounts.supplementalProduct') },
]);

// --- Sorted data ---
const sortedData = computed(() => {
    const data = [...(props.overviewTableData as any[])];
    if (!activeSort.value || !activeSort.value.order) {
        return data.sort((a, b) => castInensitiveSort(a.name, b.name));
    }

    const sortProp = activeSort.value.prop;
    const dir = activeSort.value.order === 'ascending' ? 1 : -1;
    const col = tableColumns.value.find(c => (c.sortKey ?? c.prop ?? c.key) === sortProp);

    return data.sort((a, b) => {
        if (col?.sortMethod) {
            return col.sortMethod(a, b) * dir;
        }
        const aVal = getNestedProp(a, sortProp);
        const bVal = getNestedProp(b, sortProp);
        if (aVal < bVal) return -1 * dir;
        if (aVal > bVal) return 1 * dir;
        return 0;
    });
});

const formatters = {
    percentageFormatter: (value: number) => {
        return (value * 100).toFixed(2) + '%';
    },
};
</script>

<style scoped>
.collection-select-header {
    display: flex;
    align-items: center;
    justify-content: center;
}

.collection-remove-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.collection-remove-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 4px 0;
    border-bottom: 1px solid var(--el-border-color-lighter);
}

.collection-remove-item:last-child {
    border-bottom: none;
}
</style>
