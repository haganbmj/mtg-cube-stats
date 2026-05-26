<template>
    <div class="statistics-tab">
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
            <el-col :span="12" :xs="24" :sm="24" :md="12" :lg="12">
                <CubeCardCountHistogramChart :loadedCubes="loadedCubes" :highlighted="highlightedCubeIds" />
            </el-col>

            <el-col :span="12" :xs="24" :sm="24" :md="12" :lg="12">
                <ReleaseYearDistributionBoxPlotChart :loadedCubes="loadedCubes" :highlighted="highlightedCubeIds" />
            </el-col>

            <el-col :span="12" :xs="24" :sm="24" :md="12" :lg="12">
                <AvgCmcByColorBoxPlotChart :loadedCubes="loadedCubes" :highlighted="highlightedCubeIds" />
            </el-col>

            <el-col :span="12" :xs="24" :sm="24" :md="12" :lg="12">
                <ManaValueDistributionBoxPlotChart :loadedCubes="loadedCubes" :highlighted="highlightedCubeIds" />
            </el-col>

            <el-col :span="12" :xs="24" :sm="24" :md="12" :lg="12">
                <WordCountScatterPlotChart :loadedCubes="loadedCubes" :highlighted="highlightedCubeIds" />
            </el-col>

            <el-col :span="12" :xs="24" :sm="24" :md="12" :lg="12">
                <WordCountPopularityScatterPlotChart :loadedCubes="loadedCubes" :highlighted="highlightedCubeIds" />
            </el-col>

            <el-col :span="12" :xs="24" :sm="24" :md="12" :lg="12">
                <TokenCountScatterPlotChart :loadedCubes="loadedCubes" :highlighted="highlightedCubeIds" />
            </el-col>

        <!-- <el-col :span="12" :xs="24" :sm="24" :md="12" :lg="12">
            <CategoryTable :loadedCubes="loadedCubes" />
        </el-col> -->

        <!-- <el-col :span="12" :xs="24" :sm="24" :md="12" :lg="12">
            <ReleaseYearDistributionChart :loadedCubes="loadedCubes" />
        </el-col> -->
        </el-row>
    </div>
</template>

<script lang="ts" setup>
import { ref, computed } from 'vue';
import WordCountScatterPlotChart from '../components/statistics/WordCountScatterPlotChart.vue';
import AvgCmcByColorBoxPlotChart from '../components/statistics/AvgCmcByColorBoxPlotChart.vue';
import WordCountPopularityScatterPlotChart from '../components/statistics/WordCountPopularityScatterPlotChart.vue';
import CategoryTable from '../components/statistics/CategoryTable.vue';
import CubeCardCountHistogramChart from '../components/statistics/CubeCardCountHistogramChart.vue';
import ManaValueDistributionBoxPlotChart from '../components/statistics/ManaValueDistributionBoxPlotChart.vue';
import ReleaseYearDistributionBoxPlotChart from '../components/statistics/ReleaseYearDistributionBoxPlotChart.vue';
import ReleaseYearDistributionChart from '../components/statistics/ReleaseYearDistributionChart.vue';
import TokenCountScatterPlotChart from '../components/statistics/TokenCountScatterPlotChart.vue';

const props = defineProps({
    loadedCubes: {
        type: Object,
        required: true,
    },
});

const cubeIds = computed(() => {
    return Object.values(props.loadedCubes).map(cube => {
        return {
            label: `${cube.name} (${cube.owner})`,
            value: cube.id,
        };
    }).sort((a, b) => a.label.localeCompare(b.label));
});

const highlightedCubeIds = ref<string[]>([]);

</script>

<style lang="scss">
.statistics-tab {
    max-width: 1500px;
    margin: 0 auto;
}

#charts > .el-col {
    height: min(60vw, 500px);
}
</style>
