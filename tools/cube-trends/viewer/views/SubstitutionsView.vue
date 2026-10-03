<template>
    <div class="substitutions-view">
        <EmptyState v-if="emptyReason !== null" :reason="emptyReason" />
        <template v-else>
            <div class="substitutions-table-header">
                <h3>Substitutions</h3>
                <ExportButton filename="substitutions.csv" :rows="rows" :columns="exportColumns" />
            </div>
            <el-table :data="rows" size="small">
                <el-table-column label="Removed">
                    <template #default="{ row }">
                        <CardName
                            :name="row.removedName"
                            :imageUrl="row.removedInfo?.urlFront"
                            :setCode="row.removedInfo?.eligibility?.setCode"
                            :copies="row.removedCopy"
                        />
                    </template>
                </el-table-column>
                <el-table-column label="Added">
                    <template #default="{ row }">
                        <CardName
                            :name="row.addedName"
                            :imageUrl="row.addedInfo?.urlFront"
                            :setCode="row.addedInfo?.eligibility?.setCode"
                            :copies="row.addedCopy"
                        />
                    </template>
                </el-table-column>
                <el-table-column prop="cubes" label="Cubes" />
                <el-table-column label="Lift">
                    <template #default="{ row }">{{ row.lift.toFixed(2) }}</template>
                </el-table-column>
            </el-table>
        </template>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { FullTrendsData } from '../dataSource';
import type { Substitution } from '../../analysis/substitutions';
import { copyNumber, type CardInfo } from '../../analysis/cardInfo';
import { buildCardLookup } from '../util/cardLookup';
import ExportButton from '../components/ExportButton.vue';
import EmptyState from '../components/EmptyState.vue';
import CardName from '../components/CardName.vue';
import type { CsvColumn } from '../util/csv';

const props = defineProps<{
    data: FullTrendsData;
}>();

const emptyReason = computed(() => ('empty' in props.data.substitutions ? props.data.substitutions.reason : null));
const cardLookup = computed(() => buildCardLookup(props.data.cards));

interface SubstitutionRow extends Substitution {
    removedName: string;
    removedCopy: number;
    removedInfo: CardInfo | undefined;
    addedName: string;
    addedCopy: number;
    addedInfo: CardInfo | undefined;
}

const rows = computed<SubstitutionRow[]>(() => {
    if ('empty' in props.data.substitutions) {
        return [];
    }
    return props.data.substitutions.pairs.map((pair) => ({
        ...pair,
        removedName: cardLookup.value.get(pair.removed)?.info.name ?? pair.removed,
        removedCopy: copyNumber(pair.removed),
        removedInfo: cardLookup.value.get(pair.removed)?.info,
        addedName: cardLookup.value.get(pair.added)?.info.name ?? pair.added,
        addedCopy: copyNumber(pair.added),
        addedInfo: cardLookup.value.get(pair.added)?.info,
    }));
});

const exportColumns: CsvColumn<SubstitutionRow>[] = [
    { key: 'removedName', label: 'Removed', value: (r) => r.removedName },
    { key: 'addedName', label: 'Added', value: (r) => r.addedName },
    { key: 'cubes', label: 'Cubes', value: (r) => r.cubes },
    { key: 'lift', label: 'Lift', value: (r) => r.lift },
];
</script>

<style scoped>
.substitutions-table-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
}
</style>
