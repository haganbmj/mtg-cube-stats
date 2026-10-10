<template>
    <div class="common-layout">
        <el-container>
            <el-header>
                <div class="header-row">
                    <el-breadcrumb separator=" / " class="header-breadcrumb">
                        <el-breadcrumb-item>
                            <a href="https://griselbrand.com">griselbrand.com</a>
                        </el-breadcrumb-item>
                        <el-breadcrumb-item>
                            <a href="/">Cube Comparison</a>
                        </el-breadcrumb-item>
                        <el-breadcrumb-item class="header-page-title">Cube Trends</el-breadcrumb-item>
                    </el-breadcrumb>
                    <div class="header-links">
                        <a href="https://bsky.app/profile/griselbrand.com" target="_blank" rel="noopener" title="Bluesky">
                            <svg fill="none" viewBox="0 0 64 57" width="22" style="height: auto;"><path fill="currentColor" d="M13.873 3.805C21.21 9.332 29.103 20.537 32 26.55v15.882c0-.338-.13.044-.41.867-1.512 4.456-7.418 21.847-20.923 7.944-7.111-7.32-3.819-14.64 9.125-16.85-7.405 1.264-15.73-.825-18.014-9.015C1.12 23.022 0 8.51 0 6.55 0-3.268 8.579-.182 13.873 3.805ZM50.127 3.805C42.79 9.332 34.897 20.537 32 26.55v15.882c0-.338.13.044.41.867 1.512 4.456 7.418 21.847 20.923 7.944 7.111-7.32 3.819-14.64-9.125-16.85 7.405 1.264 15.73-.825 18.014-9.015C62.88 23.022 64 8.51 64 6.55c0-9.818-8.578-6.732-13.873-2.745Z"/></svg>
                        </a>
                        <el-divider direction="vertical" />
                        <a href="https://github.com/haganbmj/mtg-cube-stats" target="_blank" rel="noopener" title="GitHub">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg>
                        </a>
                    </div>
                </div>
            </el-header>
            <el-main>
                <div class="trends-controls" v-if="manifests.length > 0">
                    <el-select v-model="selectedManifest" size="small" style="width: 220px;" placeholder="Select manifest">
                        <el-option v-for="name in manifests" :key="name" :label="name" :value="name" />
                    </el-select>

                    <span class="cell-secondary" v-if="meta">
                        Label: {{ meta.label }} · Generated: {{ generatedAt }} · Cubes: {{ meta.cubes.length }} · Gaps: {{ totalGaps }} · Missing: {{ meta.missing.length }}
                    </span>
                </div>

                <div v-loading="loading" :element-loading-text="`Loading ${selectedManifest ?? ''}…`" class="trends-body">
                    <EmptyState
                        v-if="manifests.length === 0"
                        reason="No analysis output found. Run npm run trends:fetch and npm run trends:analyze."
                    />
                    <EmptyState v-else-if="meta?.empty" :reason="meta.empty" />
                    <template v-else-if="meta">
                        <el-tabs v-model="selectedView">
                            <el-tab-pane v-for="view in VIEWS" :key="view" :label="VIEW_LABELS[view]" :name="view" />
                        </el-tabs>

                        <div class="trends-view">
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
                        </div>

                        <el-drawer v-model="cardDrawerVisible" size="70%" :title="selectedCardName">
                            <CardDetailView v-if="selectedCard" :data="fullData" :oracleId="selectedCard" />
                        </el-drawer>
                    </template>
                </div>
            </el-main>
        </el-container>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue';
import { VIEWS, VIEW_LABELS, parseHash, buildHash, type ViewName } from './router';
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
const loading = ref(false);

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
        loading.value = manifest !== null;
        const result = manifest ? await loadManifestData(manifest) : null;
        if (token !== requestToken) {
            return; // superseded by a later manifest switch
        }
        loading.value = false;
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
.trends-controls {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
    margin-bottom: 8px;
}

.trends-body {
    min-height: 300px;
}
</style>
