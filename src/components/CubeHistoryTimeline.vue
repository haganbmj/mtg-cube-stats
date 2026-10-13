<template>
    <section class="history-timeline">
        <h4 class="history-section-title">Change activity</h4>
        <div v-if="error" class="history-timeline-error">
            <el-text type="info" size="small">Couldn't load change history.</el-text>
            <el-link type="primary" underline="never" @click="load">Retry</el-link>
        </div>
        <div v-else-if="!history" v-loading="true" class="history-timeline-loading" />
        <template v-else>
            <el-empty v-if="history.entries.length === 0" description="No changes found" :image-size="60" />
            <ChangelogTimelineChart
                v-else
                :entries="history.entries"
                :start="chartStart"
                :end="now"
                :selectedWeek="selectedWeek"
                @select="toggleWeek"
            />
            <div class="history-timeline-footer">
                <el-text type="info" size="small">
                    {{ entriesInRange }} change{{ entriesInRange === 1 ? '' : 's' }} since {{ dateLabel(chartStart) }}
                    <template v-if="selectedWeek == null && history.entries.length > 0"> · click a bar to see its changes</template>
                </el-text>
                <el-button v-if="!history.exhausted" size="small" :loading="loadingOlder" @click="loadOlder">Load older</el-button>
            </div>
            <div v-if="selectedEntries.length > 0" class="history-timeline-entries">
                <div v-for="entry in selectedEntries" :key="entry.id" class="history-timeline-entry">
                    <span>{{ dateTimeLabel(entry.date) }}</span>
                    <el-tag v-if="knownDates.has(entry.date)" size="small" type="info">Loaded</el-tag>
                    <el-button
                        v-else
                        size="small"
                        :loading="loadingEntryId === entry.id"
                        :disabled="loadingEntryId != null"
                        @click="loadEntry(entry.id)"
                    >Load snapshot</el-button>
                </div>
            </div>
        </template>
    </section>
</template>

<script setup lang="ts">
import { ref, computed, inject, onMounted, type PropType } from 'vue';
import ChangelogTimelineChart from './charts/history/ChangelogTimelineChart.vue';
import { loadCubeHistory, loadOlderHistory, weekStartOf, type CubeHistory } from '../util/CubeHistory';

const YEAR_MS = 365 * 24 * 60 * 60 * 1000;

const props = defineProps({
    cubeId: {
        type: String,
        required: true,
    },
    knownSnapshotDates: {
        type: Array as PropType<number[]>,
        default: () => [],
    },
});

const emit = defineEmits<{
    (e: 'loaded'): void
}>();

const addSnapshotByChangelog = inject<(baseCubeId: string, changelogId: string, opts?: { hidden?: boolean }) => Promise<{ key: string; deduped: boolean } | null>>('addSnapshotByChangelog');

const now = Date.now();
const since = now - YEAR_MS;

const history = ref<CubeHistory | null>(null);
const error = ref(false);
const loadingOlder = ref(false);
const loadingEntryId = ref<string | null>(null);
const selectedWeek = ref<number | null>(null);
const showOlder = ref(false);

const knownDates = computed(() => new Set(props.knownSnapshotDates));

const chartStart = computed(() => {
    const oldest = history.value?.entries.at(-1)?.date;
    return showOlder.value && oldest != null && oldest < since ? oldest : since;
});

const entriesInRange = computed(() => history.value?.entries.filter(e => e.date >= chartStart.value).length ?? 0);

const selectedEntries = computed(() => {
    if (selectedWeek.value == null || !history.value) return [];
    const week = selectedWeek.value;
    return history.value.entries.filter(e => weekStartOf(e.date) === week);
});

const dateLabel = (ms: number) => new Date(ms).toISOString().slice(0, 10);
const dateTimeLabel = (ms: number) => new Date(ms).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' }) + ' UTC';

const toggleWeek = (week: number) => {
    selectedWeek.value = selectedWeek.value === week ? null : week;
};

const load = async () => {
    error.value = false;
    try {
        history.value = await loadCubeHistory(props.cubeId, { since, now });
    } catch {
        error.value = true;
    }
};

const loadOlder = async () => {
    loadingOlder.value = true;
    try {
        history.value = await loadOlderHistory(props.cubeId);
        showOlder.value = true;
    } catch {
        error.value = true;
    } finally {
        loadingOlder.value = false;
    }
};

const loadEntry = async (changelogId: string) => {
    if (!addSnapshotByChangelog) return;
    loadingEntryId.value = changelogId;
    try {
        await addSnapshotByChangelog(props.cubeId, changelogId, { hidden: true });
        emit('loaded');
    } finally {
        loadingEntryId.value = null;
    }
};

onMounted(load);
</script>

<style scoped>
.history-section-title {
    margin: 0 0 0.5rem;
    font-size: 0.95rem;
    color: var(--el-text-color-primary);
}

.history-timeline-loading {
    height: 180px;
}

.history-timeline-error,
.history-timeline-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5em;
}

.history-timeline-entries {
    margin-top: 0.5em;
    max-width: 28rem;
    display: flex;
    flex-direction: column;
    gap: 0.25em;
}

.history-timeline-entry {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5em;
}
</style>
