<template>
    <div class="cube-search-row">
        <div class="cube-search-input-wrapper">
            <el-input
                v-model="queryInput"
                placeholder="Search cubes... (e.g. size>=360 creatures>=40, or click ? for syntax help)"
                clearable
                @input="onInput"
                @clear="onClear"
                :class="{ 'has-error': !!parseError }"
            >
                <template #prefix>
                    <el-icon><Search /></el-icon>
                </template>
                <template #suffix>
                    <el-button
                        circle
                        size="small"
                        text
                        :icon="QuestionFilled"
                        title="Filter syntax help"
                        @click="showHelp = true"
                    />
                </template>
            </el-input>
            <div v-if="parseError" class="cube-search-error">{{ parseError }}</div>
        </div>

        <CubeFilterHelp v-model="showHelp" />
    </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { Search, QuestionFilled } from '@element-plus/icons-vue';
import { useDebounceFn } from '@vueuse/core';
import { useBackDismiss } from '../../util/useBackDismiss';
import CubeFilterHelp from './CubeFilterHelp.vue';
import { parseQuery } from '../../util/CardFilterParser';

const props = defineProps({
    modelValue: {
        type: String,
        default: '',
    },
});

const emit = defineEmits(['update:modelValue']);

const showHelp = ref(false);
useBackDismiss(showHelp, () => { showHelp.value = false; });
const queryInput = ref(props.modelValue);
const parseError = ref<string | null>(null);

watch(() => props.modelValue, (value) => {
    if (value !== queryInput.value) {
        queryInput.value = value;
    }
});

const debouncedEmit = useDebounceFn((value: string) => {
    const { error } = parseQuery(value);
    parseError.value = error;
    emit('update:modelValue', value);
}, 250);

function onInput(value: string) {
    debouncedEmit(value);
}

function onClear() {
    parseError.value = null;
    emit('update:modelValue', '');
}
</script>

<style scoped>
.cube-search-row {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    align-items: center;
}

.cube-search-input-wrapper {
    flex: 1 1 280px;
    min-width: 0;
}

.cube-search-error {
    margin-top: 4px;
    font-size: 12px;
    color: var(--el-color-danger);
    line-height: 1.4;
}

.has-error :deep(.el-input__wrapper) {
    box-shadow: 0 0 0 1px var(--el-color-danger) inset;
}

:deep(.el-input__clear) {
    order: -1;
}
</style>
