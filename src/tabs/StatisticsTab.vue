<template>
    <el-form-item label="Highlight:" style="width: 100%;">
        <el-select
            v-model="highlightedCubeIds"
            multiple
            collapse-tags
            label="Highlighted Cubes"
            placeholder="Select Cubes"
        >
            <el-option
                v-for="item in cubeIds"
                :key="item.value"
                :label="item.label"
                :value="item.value"
            />
        </el-select>
    </el-form-item>

    <div style="height: 500px;">
        <WordCountScatterPlot :loadedCubes="loadedCubes" :highlighted="highlightedCubeIds" />
    </div>
    <div style="height: 500px;">
        <AvgCmcByColorScatterPlot :loadedCubes="loadedCubes" :highlighted="highlightedCubeIds" />
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

const cubeIds = computed(() => {
    return Object.values(props.loadedCubes).map(cube => {
        return {
            label: cube.name,
            value: cube.id,
        };
    });
});

const highlightedCubeIds = ref<string[]>([]);

</script>
