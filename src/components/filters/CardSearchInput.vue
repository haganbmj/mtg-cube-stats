<template>
    <div class="card-search-row">
        <div class="card-search-input-wrapper">
            <el-input
                v-model="queryInput"
                placeholder="Search cards... (e.g. t:creature cmc<=3, or click ? for syntax help)"
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
            <div v-if="parseError" class="card-search-error">{{ parseError }}</div>
        </div>

        <div v-if="hasCubes" class="card-search-cube-filter">
            <TristateSelect
                :modelValue="cubeFilter"
                @update:modelValue="$emit('update:cubeFilter', $event)"
                :options="cubeOptions"
                :showModeToggle="true"
                :mode="cubeFilterMode"
                @update:mode="$emit('update:cubeFilterMode', $event)"
                placeholder="Filter by cube..."
            />
        </div>

        <CardFilterHelp v-model="showHelp" />
    </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useBackDismiss } from '../../util/useBackDismiss';
import { Search, QuestionFilled } from '@element-plus/icons-vue';
import { useDebounceFn } from '@vueuse/core';
import TristateSelect from './TristateSelect.vue';
import CardFilterHelp from './CardFilterHelp.vue';
import { parseQuery } from '../../util/CardFilterParser';

const props = defineProps({
    modelValue: {
        type: String,
        default: '',
    },
    loadedCubes: {
        type: Object,
        required: true,
    },
    cubeFilter: {
        type: Object,
        default: () => ({}),
    },
    cubeFilterMode: {
        type: String as () => 'filter' | 'highlight',
        default: 'filter',
    },
});

const emit = defineEmits(['update:modelValue', 'update:cubeFilter', 'update:cubeFilterMode']);

const showHelp = ref(false);
useBackDismiss(showHelp, () => { showHelp.value = false; });
const queryInput = ref(props.modelValue);
const parseError = ref<string | null>(null);

watch(() => props.modelValue, (value) => {
    if (value !== queryInput.value) {
        queryInput.value = value;
    }
});

const hasCubes = computed(() => Object.keys(props.loadedCubes).length > 0);

const cubeOptions = computed(() =>
    Object.entries(props.loadedCubes)
        .map(([key, cube]: [string, any]) => ({
            label: cube.name,
            value: key,
            searchTerms: [
                cube.name,
                key,
                cube.shortId,
                cube.id,
                cube.owner,
            ].filter(Boolean).map((s: string) => s.toLowerCase()),
        }))
        .sort((a, b) => a.label.localeCompare(b.label)),
);

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
.card-search-row {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    align-items: center;
}

.card-search-input-wrapper {
    flex: 1 1 280px;
    min-width: 0;
}

.card-search-error {
    margin-top: 4px;
    font-size: 12px;
    color: var(--el-color-danger);
    line-height: 1.4;
}

.card-search-cube-filter {
    flex: 0 0 260px;
}

.card-search-cube-filter :deep(.tristate-select) {
    height: var(--el-component-size);
    min-height: var(--el-component-size);
}

.has-error :deep(.el-input__wrapper) {
    box-shadow: 0 0 0 1px var(--el-color-danger) inset;
}

@media (max-width: 600px) {
    .card-search-input-wrapper {
        flex-basis: 100%;
    }

    .card-search-cube-filter {
        flex: 1 1 100%;
    }
}
</style>
