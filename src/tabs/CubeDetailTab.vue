<template>
    <div class="cube-detail-tab">
        <div v-if="loadingProgress?.active" style="padding: 40px; text-align: center;">
            <el-text type="info" style="display: block; margin-bottom: 12px;">Loading cubes...</el-text>
            <el-progress
                :percentage="loadingProgress.total > 0 ? Math.round((loadingProgress.loaded / loadingProgress.total) * 100) : 0"
                :format="() => `${loadingProgress!.loaded} / ${loadingProgress!.total}`"
            />
        </div>

        <template v-else>
            <div class="cube-selector-row">
                <el-select
                    :model-value="selectedCubeId ?? ''"
                    filterable
                    allow-create
                    default-first-option
                    placeholder="Select or paste a CubeCobra cube ID / URL"
                    @change="onCubeSelect"
                    style="width: 100%;"
                >
                    <el-option-group label="Loaded">
                        <el-option
                            v-for="{ id, cube } in visibleOptions"
                            :key="id"
                            :label="displayName(cube)"
                            :value="id"
                        >
                            <span>{{ displayName(cube) }}</span>
                            <span style="float: right; color: var(--el-text-color-secondary); font-size: 12px;">{{ cube.owner }}</span>
                        </el-option>
                    </el-option-group>
                    <el-option-group v-if="hiddenOptions.length > 0" label="Hidden / Peek-only">
                        <el-option
                            v-for="{ id, cube } in hiddenOptions"
                            :key="id"
                            :label="displayName(cube)"
                            :value="id"
                        >
                            <span>{{ displayName(cube) }}</span>
                            <span style="float: right; color: var(--el-text-color-secondary); font-size: 12px;">{{ cube.owner }}</span>
                        </el-option>
                    </el-option-group>
                </el-select>
            </div>

            <div v-if="loading" class="cube-tab-loading">
                <el-text type="info">Loading cube...</el-text>
            </div>

            <el-empty
                v-else-if="!cubeRow && selectedCubeId"
                :description="`Couldn't load cube ${selectedCubeId}`"
            />

            <el-empty
                v-else-if="!cubeRow"
                description="Select or paste a CubeCobra cube ID / URL to view a cube."
            />

            <div
                v-else
                :class="['cube-tab-content', { 'cube-tab-content--wide': activeSubtab === 'list' }]"
            >
                <CubeDetailView
                    :cubeRow="cubeRow"
                    :cubeCards="cubeCards"
                    :similarityMatrix="similarityMatrix"
                    :overviewTableData="overviewTableData"
                    :loadedCubes="loadedCubes"
                    :peerStats="peerStats"
                    :context="'tab'"
                    :activeTab="activeSubtab"
                    :searchQuery="searchQuery"
                    @update:activeTab="(v) => emit('update:activeSubtab', v)"
                    @update:searchQuery="(v) => emit('update:searchQuery', v)"
                    @select-cube="onSelectCubeFromView"
                />
            </div>
        </template>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, type PropType } from 'vue';
import type { Cube, CubeCard, CubeOverviewRow, SimilarityMatrix } from '../types';
import { displayName } from '../util/Snapshots';
import { castInensitiveSort, normalizeSortName } from '../util/HelperFunctions';
import { parseCubeIdInput } from '../util/CubeCobra';
import CubeDetailView from '../components/CubeDetailView.vue';

const props = defineProps({
    loadedCubes: {
        type: Object as () => Record<string, Cube>,
        required: true,
    },
    overviewTableData: {
        type: Array as () => CubeOverviewRow[],
        required: true,
    },
    similarityMatrix: {
        type: Object as () => SimilarityMatrix,
        required: true,
    },
    peerStats: {
        type: Object as () => Record<string, { mean: number; stddev: number }> | null,
        default: null,
    },
    loadCubeById: {
        type: Function as PropType<(id: string) => Promise<void>>,
        required: true,
    },
    loadingProgress: {
        type: Object as () => { active: boolean; loaded: number; total: number } | null,
        default: null,
    },
    selectedCubeId: {
        type: String as PropType<string | null>,
        default: null,
    },
    activeSubtab: {
        type: String,
        default: 'details',
    },
    searchQuery: {
        type: String,
        default: '',
    },
});

const emit = defineEmits<{
    (e: 'update:selectedCubeId', value: string | null): void
    (e: 'update:activeSubtab', value: string): void
    (e: 'update:searchQuery', value: string): void
}>();

const loading = ref(false);

const sortedCubeOptions = computed(() =>
    Object.entries(props.loadedCubes)
        .map(([id, cube]) => ({ id, cube }))
        .sort((a, b) => castInensitiveSort(normalizeSortName(a.cube.name), normalizeSortName(b.cube.name))),
);

const visibleOptions = computed(() => sortedCubeOptions.value.filter(({ cube }) => !cube.hidden));
const hiddenOptions = computed(() => sortedCubeOptions.value.filter(({ cube }) => cube.hidden));

const cubeRow = computed<CubeOverviewRow | null>(() => {
    if (!props.selectedCubeId) return null;
    const visible = props.overviewTableData.find(c => c.id === props.selectedCubeId);
    if (visible) return visible;
    const hidden = props.loadedCubes[props.selectedCubeId];
    if (!hidden) return null;
    // Mirror App.vue's getCubeRow shape for hidden cubes.
    return { ...hidden, cards: undefined, suffixedCardIds: undefined, avgSimilarityScore: 0 } as unknown as CubeOverviewRow;
});

const cubeCards = computed<CubeCard[]>(() => {
    if (!props.selectedCubeId) return [];
    return props.loadedCubes[props.selectedCubeId]?.cards ?? [];
});

const onCubeSelect = async (value: string) => {
    if (!value) return;
    if (props.loadedCubes[value]) {
        emit('update:selectedCubeId', value);
        return;
    }
    const id = parseCubeIdInput(value);
    const existing = Object.entries(props.loadedCubes).find(
        ([, cube]) => cube.id === id || cube.shortId === id,
    );
    if (existing) {
        emit('update:selectedCubeId', existing[0]);
        return;
    }
    loading.value = true;
    try {
        await props.loadCubeById(value);
        const found = Object.entries(props.loadedCubes).find(
            ([, cube]) => cube.id === id || cube.shortId === id,
        );
        if (found) emit('update:selectedCubeId', found[0]);
    } finally {
        loading.value = false;
    }
};

const onSelectCubeFromView = (id: string) => {
    emit('update:selectedCubeId', id);
    // Clear search on cube switch; preserve sub-tab. Matches dialog behavior.
    emit('update:searchQuery', '');
};

// Auto-load when the URL supplies an id we don't have yet.
watch(
    () => props.selectedCubeId,
    async (id) => {
        if (!id) return;
        if (props.loadedCubes[id]) return;
        loading.value = true;
        try {
            await props.loadCubeById(id);
            // Normalize short-form/alias ids to the internal key used by loadedCubes.
            const parsed = parseCubeIdInput(id);
            const found = Object.entries(props.loadedCubes).find(
                ([, cube]) => cube.id === parsed || cube.shortId === parsed,
            );
            if (found && found[0] !== id) {
                emit('update:selectedCubeId', found[0]);
            }
        } finally {
            loading.value = false;
        }
    },
    { immediate: true },
);
</script>

<style scoped>
.cube-detail-tab {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.cube-selector-row {
    max-width: 900px;
}

.cube-tab-loading {
    padding: 40px;
    text-align: center;
}

.cube-tab-content {
    max-width: 1900px;
    margin: 0 auto;
    width: 100%;
}

.cube-tab-content--wide {
    max-width: none;
}
</style>
