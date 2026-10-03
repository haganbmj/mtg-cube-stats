<template>
    <div class="trends-app">
        <header class="trends-header">
            <h1>Cube Trends</h1>

            <template v-if="manifests.length > 0">
                <el-select v-model="selectedManifest" style="width: 220px;" placeholder="Select manifest">
                    <el-option v-for="name in manifests" :key="name" :label="name" :value="name" />
                </el-select>

                <dl class="trends-meta" v-if="meta">
                    <dt>Label</dt><dd>{{ meta.label }}</dd>
                    <dt>Generated</dt><dd>{{ generatedAt }}</dd>
                    <dt>Cubes</dt><dd>{{ meta.cubes.length }}</dd>
                    <dt>Gaps</dt><dd>{{ totalGaps }}</dd>
                    <dt>Missing</dt><dd>{{ meta.missing.length }}</dd>
                </dl>
            </template>
        </header>

        <EmptyState
            v-if="manifests.length === 0"
            reason="No analysis output found. Run npm run trends:fetch and npm run trends:analyze."
        />
        <EmptyState v-else-if="meta?.empty" :reason="meta.empty" />
        <template v-else-if="meta">
            <el-tabs v-model="selectedView">
                <el-tab-pane v-for="view in VIEWS" :key="view" :label="view" :name="view" />
            </el-tabs>

            <OverviewView v-if="selectedView === 'overview'" :data="fullData" />
            <CardsView v-else-if="selectedView === 'cards'" :data="fullData" @select-card="selectedCard = $event" />
            <SetsView v-else-if="selectedView === 'sets'" :data="fullData" />
            <RecencyView v-else-if="selectedView === 'recency'" :data="fullData" />
            <ShapeView v-else-if="selectedView === 'shape'" :data="fullData" />
            <ChurnView v-else-if="selectedView === 'churn'" :data="fullData" />
            <SurvivalView v-else-if="selectedView === 'survival'" :data="fullData" />
            <TrendsettersView v-else-if="selectedView === 'trendsetters'" :data="fullData" />
            <HomogenizationView v-else-if="selectedView === 'homogenization'" :data="fullData" />
            <SubstitutionsView v-else-if="selectedView === 'substitutions'" :data="fullData" />
            <ConsensusView v-else-if="selectedView === 'consensus'" :data="fullData" />
            <EmptyState v-else reason="Coming soon" />

            <el-drawer v-model="cardDrawerVisible" size="70%" :title="selectedCardName">
                <CardDetailView v-if="selectedCard" :data="fullData" :oracleId="selectedCard" />
            </el-drawer>
        </template>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue';
import { VIEWS, parseHash, buildHash, type ViewName } from './router';
import { listManifests, loadManifestData, type TrendsData, type FullTrendsData } from './dataSource';
import EmptyState from './components/EmptyState.vue';
import OverviewView from './views/OverviewView.vue';
import CardsView from './views/CardsView.vue';
import CardDetailView from './views/CardDetailView.vue';
import SetsView from './views/SetsView.vue';
import RecencyView from './views/RecencyView.vue';
import ShapeView from './views/ShapeView.vue';
import ChurnView from './views/ChurnView.vue';
import SurvivalView from './views/SurvivalView.vue';
import TrendsettersView from './views/TrendsettersView.vue';
import HomogenizationView from './views/HomogenizationView.vue';
import SubstitutionsView from './views/SubstitutionsView.vue';
import ConsensusView from './views/ConsensusView.vue';

const manifests = ref<string[]>(listManifests());
const selectedManifest = ref<string | null>(null);
// Tracks which manifest's data is actually loaded, since selectedManifest may already
// equal the hash's manifest by the time applyHash runs (e.g. user picked it in the select).
const loadedManifest = ref<string | null>(null);
let requestToken = 0;
const selectedView = ref<ViewName>('overview');
const selectedCard = ref<string | null>(null);
const data = ref<TrendsData | null>(null);

const meta = computed(() => data.value?.meta ?? null);
const generatedAt = computed(() => (meta.value ? new Date(meta.value.generatedAt).toLocaleString() : ''));
const totalGaps = computed(() => (meta.value ? meta.value.cubes.reduce((sum, cube) => sum + cube.gaps, 0) : 0));

// Non-empty analyses guarantee every AnalysisData field is present; asserted once here.
const fullData = computed(() => data.value as FullTrendsData);
const cardDrawerVisible = computed({
    get: () => selectedCard.value !== null,
    set: (value: boolean) => {
        if (!value) {
            selectedCard.value = null;
        }
    },
});
const selectedCardName = computed(() => (
    fullData.value?.cards?.cards.find((card) => card.info.oracleId === selectedCard.value)?.info.name ?? ''
));

async function applyHash(): Promise<void> {
    const route = parseHash(location.hash);
    const manifest = route.manifest && manifests.value.includes(route.manifest)
        ? route.manifest
        : manifests.value[0] ?? null;

    selectedView.value = route.view;
    selectedCard.value = route.card;
    selectedManifest.value = manifest;

    if (manifest !== loadedManifest.value) {
        const token = ++requestToken;
        const result = manifest ? await loadManifestData(manifest) : null;
        if (token !== requestToken) {
            return; // superseded by a later manifest switch
        }
        loadedManifest.value = manifest;
        data.value = result;
    }
}

function syncHash(): void {
    const hash = buildHash({ manifest: selectedManifest.value, view: selectedView.value, card: selectedCard.value });
    if (hash !== location.hash) {
        location.hash = hash;
    }
}

watch(selectedManifest, syncHash);
watch(selectedView, syncHash);
watch(selectedCard, syncHash);

onMounted(() => {
    window.addEventListener('hashchange', applyHash);
    if (manifests.value.length > 0) {
        void applyHash();
    }
});

onBeforeUnmount(() => {
    window.removeEventListener('hashchange', applyHash);
});
</script>

<style scoped>
.trends-header {
    display: flex;
    align-items: center;
    gap: 16px;
    flex-wrap: wrap;
}

.trends-meta {
    display: grid;
    grid-template-columns: repeat(5, auto);
    gap: 4px 8px;
    margin: 0;
}

.trends-meta dt {
    font-weight: bold;
}

.trends-meta dd {
    margin: 0;
}
</style>
