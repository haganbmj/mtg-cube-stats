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

            <OverviewView v-if="selectedView === 'overview'" :meta="meta" />
            <EmptyState v-else reason="Coming soon" />
        </template>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue';
import { VIEWS, parseHash, buildHash, type ViewName } from './router';
import { listManifests, loadManifestData, type TrendsData } from './dataSource';
import EmptyState from './components/EmptyState.vue';
import OverviewView from './views/OverviewView.vue';

const manifests = ref<string[]>(listManifests());
const selectedManifest = ref<string | null>(null);
const selectedView = ref<ViewName>('overview');
const selectedCard = ref<string | null>(null);
const data = ref<TrendsData | null>(null);

const meta = computed(() => data.value?.meta ?? null);
const generatedAt = computed(() => (meta.value ? new Date(meta.value.generatedAt).toLocaleString() : ''));
const totalGaps = computed(() => (meta.value ? meta.value.cubes.reduce((sum, cube) => sum + cube.gaps, 0) : 0));

async function applyHash(): Promise<void> {
    const route = parseHash(location.hash);
    const manifest = route.manifest && manifests.value.includes(route.manifest)
        ? route.manifest
        : manifests.value[0] ?? null;

    selectedView.value = route.view;
    selectedCard.value = route.card;

    if (manifest !== selectedManifest.value) {
        selectedManifest.value = manifest;
        data.value = manifest ? await loadManifestData(manifest) : null;
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
