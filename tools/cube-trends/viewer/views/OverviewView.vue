<template>
    <div class="overview-view">
        <h3>Samples</h3>
        <p>{{ meta.samples.length }} snapshots &middot; {{ meta.unknownCards }} unknown cards</p>

        <h3>Cubes ({{ meta.cubes.length }})</h3>
        <el-table :data="meta.cubes" size="small">
            <el-table-column prop="name" label="Cube" />
            <el-table-column prop="owner" label="Owner" />
            <el-table-column prop="coverage" label="Coverage" />
            <el-table-column prop="gaps" label="Gaps" />
        </el-table>

        <template v-if="meta.missing.length > 0">
            <h3>Missing ({{ meta.missing.length }})</h3>
            <ul>
                <li v-for="id in meta.missing" :key="id">{{ id }}</li>
            </ul>
        </template>
    </div>
</template>

<script setup lang="ts">
import type { MetaResult } from '../../output';

defineProps<{
    meta: MetaResult;
}>();
</script>
