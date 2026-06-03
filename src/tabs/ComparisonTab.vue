<template>
    <div class="comparison-tab">
        <!-- Loading state -->
        <div v-if="props.loadingProgress?.active" style="padding: 40px; text-align: center;">
            <el-text type="info" style="display: block; margin-bottom: 12px;">Loading cubes...</el-text>
            <el-progress
                :percentage="props.loadingProgress.total > 0 ? Math.round((props.loadingProgress.loaded / props.loadingProgress.total) * 100) : 0"
                :format="() => `${props.loadingProgress!.loaded} / ${props.loadingProgress!.total}`"
            />
        </div>

        <!-- Normal content -->
        <template v-else>
            <div class="comparison-selectors">
                <div class="cube-selector">
                    <el-select
                        v-model="cubeAId"
                        filterable
                        allow-create
                        default-first-option
                        placeholder="Select Cube A"
                        @change="(v: string) => onCubeSelect(v, 'A')"
                        style="width: 100%;"
                    >
                        <el-option
                            v-for="{ id, cube } in sortedCubeOptions"
                            :key="id"
                            :label="cube.name"
                            :value="id"
                        >
                            <span>{{ cube.name }}</span>
                            <span style="float: right; color: var(--el-text-color-secondary); font-size: 12px;">{{ cube.owner }}</span>
                        </el-option>
                    </el-select>
                </div>
                <el-button :icon="Sort" @click="swapCubes" title="Swap cubes" />
                <div class="cube-selector">
                    <el-select
                        v-model="cubeBId"
                        filterable
                        allow-create
                        default-first-option
                        placeholder="Select Cube B"
                        @change="(v: string) => onCubeSelect(v, 'B')"
                        style="width: 100%;"
                    >
                        <el-option
                            v-for="{ id, cube } in sortedCubeOptions"
                            :key="id"
                            :label="cube.name"
                            :value="id"
                        >
                            <span>{{ cube.name }}</span>
                            <span style="float: right; color: var(--el-text-color-secondary); font-size: 12px;">{{ cube.owner }}</span>
                        </el-option>
                    </el-select>
                </div>
            </div>

            <div v-if="loading" class="comparison-loading">
                <el-text type="info">Loading cube...</el-text>
            </div>

            <template v-if="cubeA && cubeB">
                <div class="comparison-headers">
                    <div class="cube-header">
                        <el-image v-if="cubeA.thumbnail" :src="cubeA.thumbnail" fit="cover" class="cube-header-image" />
                        <div class="cube-header-info">
                            <el-link :href="`https://cubecobra.com/cube/about/${cubeA.id}`" target="_blank" type="default" underline="never" @click.prevent="openCubeDetailDialog?.(cubeA.id)">
                                <span class="cube-header-name">{{ cubeA.name }}</span>
                            </el-link>
                            <el-link :href="`https://cubecobra.com/user/view/${cubeA.ownerId}`" target="_blank" underline="never">
                                <span class="cube-header-owner">{{ cubeA.owner }}</span>
                            </el-link>
                            <div class="cube-header-meta">
                                <span>Cards: <strong>{{ cubeA.stats?.totalCards ?? cubeA.cards.length }}</strong></span>
                                <span>Avg CMC: <strong>{{ cubeA.stats?.averageNonLandCmc?.toFixed(2) ?? '—' }}</strong></span>
                                <span>Avg Elo: <strong>{{ cubeA.stats?.averageElo?.toFixed(0) ?? '—' }}</strong></span>
                                <span v-if="cubeA.lastModified">Modified: <strong>{{ formatDate(cubeA.lastModified) }}</strong></span>
                            </div>
                        </div>
                    </div>
                    <div class="cube-header">
                        <el-image v-if="cubeB.thumbnail" :src="cubeB.thumbnail" fit="cover" class="cube-header-image" />
                        <div class="cube-header-info">
                            <el-link :href="`https://cubecobra.com/cube/about/${cubeB.id}`" target="_blank" type="default" underline="never" @click.prevent="openCubeDetailDialog?.(cubeB.id)">
                                <span class="cube-header-name">{{ cubeB.name }}</span>
                            </el-link>
                            <el-link :href="`https://cubecobra.com/user/view/${cubeB.ownerId}`" target="_blank" underline="never">
                                <span class="cube-header-owner">{{ cubeB.owner }}</span>
                            </el-link>
                            <div class="cube-header-meta">
                                <span>Cards: <strong>{{ cubeB.stats?.totalCards ?? cubeB.cards.length }}</strong></span>
                                <span>Avg CMC: <strong>{{ cubeB.stats?.averageNonLandCmc?.toFixed(2) ?? '—' }}</strong></span>
                                <span>Avg Elo: <strong>{{ cubeB.stats?.averageElo?.toFixed(0) ?? '—' }}</strong></span>
                                <span v-if="cubeB.lastModified">Modified: <strong>{{ formatDate(cubeB.lastModified) }}</strong></span>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="comparison-filter">
                    <CardSearchInput
                        class="card-table-search"
                        v-model="activeQuery"
                        :loaded-cubes="{}"
                        :collapse-cube-filter="true"
                    />
                    <el-button-group>
                        <el-button :icon="BrushFilled" :type="filterMode === 'dim' ? 'primary' : ''" @click="filterMode = 'dim'" title="Highlight matched cards" />
                        <el-button :icon="Hide" :type="filterMode === 'hide' ? 'primary' : ''" @click="filterMode = 'hide'" title="Hide unmatched cards" />
                    </el-button-group>
                </div>

                <CubeComparisonView
                    :only-a="onlyA"
                    :both="both"
                    :only-b="onlyB"
                    :cube-a="cubeA"
                    :cube-b="cubeB"
                    :matching-oracle-ids="matchingOracleIds"
                    :filter-mode="filterMode"
                />
            </template>
        </template>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, inject } from 'vue';
import type { Cube, CubeCard } from '../types';
import CubeComparisonView from '../components/CubeComparisonView.vue';
import CardSearchInput from '../components/filters/CardSearchInput.vue';
import { parseQuery } from '../util/CardFilterParser';
import { evaluateCard, type FilterContext } from '../util/CardFilterEvaluator';
import { bindStorage } from '../util/VueLocalStorage';
import { Sort, Hide, BrushFilled } from '@element-plus/icons-vue';
import { normalizeSortName, castInensitiveSort } from '../util/HelperFunctions';

const openCubeDetailDialog = inject<(cubeId: string) => void>('openCubeDetailDialog');

const emit = defineEmits<{
    'update:comparePair': [pair: { cubeAId: string; cubeBId: string } | null];
}>();

const props = defineProps({
    loadedCubes: {
        type: Object as () => Record<string, Cube>,
        required: true,
    },
    addCube: {
        type: Function as unknown as () => (cubeId: string) => Promise<void>,
        required: true,
    },
    comparePair: {
        type: Object as () => { cubeAId: string; cubeBId: string } | null,
        default: null,
    },
    loadingProgress: {
        type: Object as () => { active: boolean; loaded: number; total: number } | null,
        default: null,
    },
});

const cubeAId = ref<string>('');
const cubeBId = ref<string>('');
const loading = ref(false);
const cubeA = computed(() => cubeAId.value ? props.loadedCubes[cubeAId.value] ?? null : null);
const cubeB = computed(() => cubeBId.value ? props.loadedCubes[cubeBId.value] ?? null : null);

const sortedCubeOptions = computed(() => {
    return Object.entries(props.loadedCubes)
        .map(([id, cube]) => ({ id, cube }))
        .sort((a, b) => castInensitiveSort(normalizeSortName(a.cube.name), normalizeSortName(b.cube.name)));
});

// Default to first two cubes when loadedCubes changes
watch(() => Object.keys(props.loadedCubes), (keys) => {
    if (cubeAId.value && !props.loadedCubes[cubeAId.value]) {
        cubeAId.value = keys.find(k => k !== cubeBId.value) ?? '';
    }
    if (cubeBId.value && !props.loadedCubes[cubeBId.value]) {
        cubeBId.value = keys.find(k => k !== cubeAId.value) ?? '';
    }
    if (!cubeAId.value && keys.length >= 1) cubeAId.value = keys[0];
    if (!cubeBId.value && keys.length >= 2) cubeBId.value = keys[1];
}, { immediate: true });

// Watch for external navigation to comparison
watch(() => props.comparePair, (pair) => {
    if (pair) {
        cubeAId.value = pair.cubeAId;
        cubeBId.value = pair.cubeBId;
    }
});

// Emit selection changes back to parent for URL sync
watch([cubeAId, cubeBId], ([a, b]) => {
    if (a && b) {
        emit('update:comparePair', { cubeAId: a, cubeBId: b });
    } else {
        emit('update:comparePair', null);
    }
});

const onCubeSelect = async (value: string, side: 'A' | 'B') => {
    if (props.loadedCubes[value]) return;
    // Extract the cube ID from the input the same way addCube does
    const input = value.split('?')[0].trim();
    const match = input.match(/([^\/]+)\/?$/);
    const id = match ? match[1] : value;
    // Check if already loaded under a different key
    const existing = Object.entries(props.loadedCubes).find(
        ([, cube]) => cube.id === id || cube.shortId === id,
    );
    if (existing) {
        if (side === 'A') cubeAId.value = existing[0];
        else cubeBId.value = existing[0];
        return;
    }
    // Load the cube
    loading.value = true;
    try {
        await props.addCube(value);
        const found = Object.entries(props.loadedCubes).find(
            ([, cube]) => cube.id === id || cube.shortId === id,
        );
        if (found) {
            if (side === 'A') cubeAId.value = found[0];
            else cubeBId.value = found[0];
        }
    } finally {
        loading.value = false;
    }
};

const swapCubes = () => {
    const tmp = cubeAId.value;
    cubeAId.value = cubeBId.value;
    cubeBId.value = tmp;
};

// --- Card Diffing ---
const diffResult = computed(() => {
    const a = cubeA.value;
    const b = cubeB.value;
    if (!a || !b) return { onlyA: [] as CubeCard[], both: [] as CubeCard[], onlyB: [] as CubeCard[] };

    // Build frequency maps: oracleId -> count
    const freqA = new Map<string, number>();
    const cardMapA = new Map<string, CubeCard>();
    for (const card of a.cards) {
        freqA.set(card.oracleId, (freqA.get(card.oracleId) ?? 0) + 1);
        if (!cardMapA.has(card.oracleId)) cardMapA.set(card.oracleId, card);
    }

    const freqB = new Map<string, number>();
    const cardMapB = new Map<string, CubeCard>();
    for (const card of b.cards) {
        freqB.set(card.oracleId, (freqB.get(card.oracleId) ?? 0) + 1);
        if (!cardMapB.has(card.oracleId)) cardMapB.set(card.oracleId, card);
    }

    const allIds = new Set([...freqA.keys(), ...freqB.keys()]);
    const onlyA: CubeCard[] = [];
    const both: CubeCard[] = [];
    const onlyB: CubeCard[] = [];

    for (const oracleId of allIds) {
        const countA = freqA.get(oracleId) ?? 0;
        const countB = freqB.get(oracleId) ?? 0;
        const card = cardMapA.get(oracleId) ?? cardMapB.get(oracleId)!;
        const shared = Math.min(countA, countB);

        for (let i = 0; i < shared; i++) both.push(card);
        for (let i = 0; i < countA - shared; i++) onlyA.push(card);
        for (let i = 0; i < countB - shared; i++) onlyB.push(card);
    }

    return { onlyA, both, onlyB };
});

const onlyA = computed(() => diffResult.value.onlyA);
const both = computed(() => diffResult.value.both);
const onlyB = computed(() => diffResult.value.onlyB);

// --- Search / Filter ---
const activeQuery = ref('');
const filterMode = bindStorage('comparison-filter-mode', (v) => {
    return v === 'dim' ? 'dim' : 'hide';
});

const matchingOracleIds = computed<Set<string> | null>(() => {
    const { ast } = parseQuery(activeQuery.value);
    if (!ast) return null;
    const ctx: FilterContext = { loadedCubes: {} };
    const allCards = [...(cubeA.value?.cards ?? []), ...(cubeB.value?.cards ?? [])];
    const ids = new Set<string>();
    for (const card of allCards) {
        const row = { ...card, effectiveColors: card.colors, effectiveColorIdentity: card.colorIdentity };
        if (evaluateCard(ast, row, ctx)) ids.add(card.oracleId);
    }
    return ids;
});

const formatDate = (dateStr: string) => {
    try {
        return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch {
        return dateStr;
    }
};
</script>

<style scoped>
.comparison-tab {
    max-width: 1500px;
    margin: 0 auto;
    width: 100%;
}

.comparison-selectors {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 12px;
}

.comparison-loading {
    padding: 24px 0;
    text-align: center;
}

.cube-selector {
    flex: 1;
    min-width: 0;
}

.comparison-headers {
    display: flex;
    gap: 16px;
    margin-bottom: 12px;
}

.cube-header {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 8px 12px;
    background: var(--el-bg-color-overlay);
    border-radius: 6px;
}

.cube-header-image {
    width: 60px;
    height: 60px;
    border-radius: 8px;
    overflow: hidden;
    flex-shrink: 0;
}

.cube-header-info {
    min-width: 0;
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 0 8px;
}

.cube-header-name {
    font-size: 15px;
    font-weight: 600;
}

.cube-header-owner {
    font-size: 12px;
    color: var(--el-text-color-secondary);
}

.cube-header-meta {
    width: 100%;
    display: flex;
    flex-wrap: wrap;
    gap: 4px 12px;
    font-size: 12px;
    color: var(--el-text-color-secondary);
}

.comparison-filter {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
}

.card-table-search {
    flex: 1;
    min-width: 0;
}

@media (max-width: 760px) {
    .cube-header {
        flex-direction: column;
        align-items: center;
        gap: 8px;
    }

    .cube-header-info {
        flex-direction: column;
        gap: 2px;
    }

    .cube-header-meta {
        width: auto;
    }
}
</style>
