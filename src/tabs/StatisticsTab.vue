<template>
    <el-row>
        <el-col :span="24">
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
        </el-col>
    </el-row>

    <el-row id="charts" :gutter="10">
        <el-col :span="24">
            <AvgCmcByColorScatterPlot :loadedCubes="loadedCubes" :highlighted="highlightedCubeIds" />
        </el-col>

        <el-col :span="12" :xs="24" :sm="24" :md="12" :lg="12">
            <WordCountScatterPlot :loadedCubes="loadedCubes" :highlighted="highlightedCubeIds" style="height: 500px;"/>
        </el-col>

        <el-col :span="12" :xs="24" :sm="24" :md="12" :lg="12">
            <WordCountPopularityScatterPlot :loadedCubes="loadedCubes" :highlighted="highlightedCubeIds" style="height: 500px;"/>
        </el-col>
    </el-row>
</template>

<script lang="ts" setup>
import { ref, computed } from 'vue';
import WordCountScatterPlot from '../components/statistics/WordCountScatterPlot.vue';
import AvgCmcByColorScatterPlot from '../components/statistics/AvgCmcByColorScatterPlot.vue';
import WordCountPopularityScatterPlot from '../components/statistics/WordCountPopularityScatterPlot.vue';

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

<style lang="scss">
#charts > .el-col {
    height: 500px;
}
</style>
