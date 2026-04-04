<template>
    <el-row style="margin-bottom: 12px;">
        <el-col :span="24">
            <el-form inline>
                <el-form-item>
                    <el-text type="info">
                        {{ aggregationResult.cards.length.toLocaleString() }} unique cards across {{ Object.keys(loadedCubes).length }} cubes
                    </el-text>
                </el-form-item>
            </el-form>
        </el-col>
    </el-row>

    <TagSynergyChart
        :cards="aggregationResult.cards"
        :card-sizes="aggregationResult.cardSizes"
    />
</template>

<script setup lang="ts">
import { computed } from 'vue';
import TagSynergyChart from '../components/charts/TagSynergyChart.vue';
import type { CubeCard } from '../types/cube';

const props = defineProps({
    loadedCubes: {
        type: Object,
        required: true,
    },
});

const aggregationResult = computed(() => {
    const seenCards = new Map<string, CubeCard>();
    const cubeCounts = new Map<string, number>();

    for (const cube of Object.values(props.loadedCubes) as any[]) {
        for (const card of (cube.cards ?? []) as CubeCard[]) {
            if (!seenCards.has(card.oracleId)) {
                seenCards.set(card.oracleId, card);
            }
            cubeCounts.set(card.oracleId, (cubeCounts.get(card.oracleId) ?? 0) + 1);
        }
    }

    const cards = Array.from(seenCards.values());

    const cardSizes: Record<string, number> = {};
    for (const [oracleId, count] of cubeCounts) {
        cardSizes[oracleId] = Math.min(8 + count * 2, 20);
    }

    return { cards, cardSizes };
});
</script>
