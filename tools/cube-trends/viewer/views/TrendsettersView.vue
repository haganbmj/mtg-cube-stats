<template>
    <div class="trendsetters-view">
        <EmptyState v-if="emptyReason !== null" :reason="emptyReason" />
        <template v-else>
            <div class="trendsetters-table-header">
                <h3>Trendsetting Cubes</h3>
                <ExportButton filename="trendsetters.csv" :rows="rows" :columns="exportColumns" />
            </div>
            <el-table :data="rows" size="small">
                <el-table-column prop="name" label="Cube" />
                <el-table-column prop="adoptions" label="Adoptions" />
                <el-table-column label="Mean Percentile">
                    <template #default="{ row }">{{ formatPercent(row.meanPercentile) }}</template>
                </el-table-column>
                <el-table-column label="Mean Lag">
                    <template #default="{ row }">{{ row.meanLagDays === null ? '—' : `${row.meanLagDays.toFixed(1)}d` }}</template>
                </el-table-column>
                <el-table-column prop="leadOnConsensus" label="Lead on Consensus" />
                <el-table-column label="Examples">
                    <template #default="{ row }">
                        <span v-for="(example, i) in row.examples" :key="example.oracleId">
                            <CardName
                                :name="cardLookup.get(example.oracleId)?.info.name ?? example.oracleId"
                                :imageUrl="cardLookup.get(example.oracleId)?.info.urlFront"
                                :setCode="cardLookup.get(example.oracleId)?.info.eligibility?.setCode"
                            /><template v-if="i < row.examples.length - 1">, </template>
                        </span>
                    </template>
                </el-table-column>
            </el-table>
        </template>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { FullTrendsData } from '../dataSource';
import type { Trendsetter } from '../../analysis/trendsetters';
import { buildCardLookup } from '../util/cardLookup';
import { formatPercent } from '../util/format';
import ExportButton from '../components/ExportButton.vue';
import EmptyState from '../components/EmptyState.vue';
import CardName from '../components/CardName.vue';
import type { CsvColumn } from '../util/csv';

const props = defineProps<{
    data: FullTrendsData;
}>();

const emptyReason = computed(() => ('empty' in props.data.trendsetters ? props.data.trendsetters.reason : null));

const cubeLookup = computed(() => new Map(props.data.meta.cubes.map((cube) => [cube.id, cube])));
const cardLookup = computed(() => buildCardLookup(props.data.cards));

interface TrendsetterRow extends Trendsetter {
    name: string;
    exampleNames: string[];
}

const rows = computed<TrendsetterRow[]>(() => {
    if ('empty' in props.data.trendsetters) {
        return [];
    }
    return props.data.trendsetters.cubes.map((cube) => ({
        ...cube,
        name: cubeLookup.value.get(cube.cubeId)?.name ?? cube.cubeId,
        exampleNames: cube.examples.map((e) => cardLookup.value.get(e.oracleId)?.info.name ?? e.oracleId),
    }));
});

const exportColumns: CsvColumn<TrendsetterRow>[] = [
    { key: 'name', label: 'Cube', value: (r) => r.name },
    { key: 'adoptions', label: 'Adoptions', value: (r) => r.adoptions },
    { key: 'meanPercentile', label: 'Mean Percentile', value: (r) => r.meanPercentile },
    { key: 'meanLagDays', label: 'Mean Lag Days', value: (r) => r.meanLagDays },
    { key: 'leadOnConsensus', label: 'Lead on Consensus', value: (r) => r.leadOnConsensus },
    { key: 'examples', label: 'Examples', value: (r) => r.exampleNames.join(', ') },
];
</script>

<style scoped>
.trendsetters-table-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
}
</style>
