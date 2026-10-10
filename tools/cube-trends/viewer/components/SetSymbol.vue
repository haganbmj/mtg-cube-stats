<template>
    <i class="ss ss-fw set-symbol" :class="`ss-${setCode.toLowerCase()}`" :title="title" aria-hidden="true"></i>
</template>

<script setup lang="ts">
import { computed } from 'vue';

// Mirrors src/components/SetSymbol.vue without its CubeFunctions import, which would pull card data into the report.
const props = defineProps<{
    setCode: string;
    setName?: string;
}>();

const title = computed(() => {
    const code = props.setCode.toUpperCase();
    return props.setName && props.setName.toLowerCase() !== props.setCode.toLowerCase() ? `${props.setName} (${code})` : code;
});
</script>

<style scoped>
.set-symbol {
    color: var(--el-text-color-regular);
    vertical-align: middle;
    margin-right: 4px;
    font-size: 1.1em;
}
</style>
