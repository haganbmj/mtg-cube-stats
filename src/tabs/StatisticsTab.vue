<template>
    <div style="height: 500px;">
        <WordCountScatterPlot :loadedCubes="loadedCubes" />
    </div>
    <div style="height: 500px;">
        <AvgCmcByColorScatterPlot :loadedCubes="loadedCubes" />
    </div>
</template>

<script lang="ts" setup>
import { ref, computed } from 'vue';
import WordCountScatterPlot from '../components/statistics/WordCountScatterPlot.vue';
import AvgCmcByColorScatterPlot from '../components/statistics/AvgCmcByColorScatterPlot.vue';

const props = defineProps({
    loadedCubes: {
        type: Object,
        required: true,
    },
});

</script>
