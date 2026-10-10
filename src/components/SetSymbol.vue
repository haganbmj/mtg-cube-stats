<template>
    <i
        class="ss ss-fw set-symbol"
        :class="symbolClass"
        :title="title"
        aria-hidden="true"
    ></i>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { getSetName } from '../util/CubeFunctions';

const props = defineProps({
    setCode: {
        type: String,
        required: true,
    },
    setName: {
        type: String,
        default: null,
    },
});

const symbolClass = computed(() => `ss-${props.setCode.toLowerCase()}`);

const title = computed(() => {
    const name = props.setName ?? getSetName(props.setCode);
    const code = props.setCode.toUpperCase();
    return name && name.toLowerCase() !== props.setCode.toLowerCase() ? `${name} (${code})` : code;
});
</script>

<style scoped>
.set-symbol {
    color: var(--el-text-color-regular);
    vertical-align: middle;
}
</style>
