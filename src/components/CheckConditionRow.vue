<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useDebounceFn } from '@vueuse/core';
import type { CheckCondition, CheckResult } from '../types/checks';
import { parseCheckExpression } from '../util/CheckExpressionParser';

const props = defineProps<{
  condition: CheckCondition;
  cubeResults: Array<{ cubeId: string; cubeName: string; result: CheckResult | undefined }>;
}>();

const emit = defineEmits<{
  (e: 'update:expression', value: string): void;
  (e: 'update:label', value: string): void;
  (e: 'delete'): void;
}>();

const localExpression = ref(props.condition.expression);
const parseError = ref<string | null>(null);
const expanded = ref(false);

watch(() => props.condition.expression, (val) => {
  localExpression.value = val;
});

const debouncedUpdate = useDebounceFn((val: string) => {
  const result = parseCheckExpression(val);
  parseError.value = result.error;
  emit('update:expression', val);
}, 250);

function onInput(val: string) {
  localExpression.value = val;
  debouncedUpdate(val);
}

const passCount = computed(() => {
  return props.cubeResults.filter(r => r.result?.passed).length;
});

const totalCount = computed(() => {
  return props.cubeResults.length;
});

const sortedCubeResults = computed(() => {
  return [...props.cubeResults].sort((a, b) => {
    const aPassed = a.result?.passed ? 0 : 1;
    const bPassed = b.result?.passed ? 0 : 1;
    return aPassed - bPassed;
  });
});
</script>

<template>
    <div class="check-condition-row">
        <div class="condition-header">
            <el-input
                :model-value="localExpression"
                placeholder="Enter check expression..."
                :class="{ 'is-error': parseError }"
                @input="onInput"
            >
                <template #append>
                    <span class="pass-count" @click="expanded = !expanded">
                        {{ passCount }}/{{ totalCount }}
                    </span>
                </template>
            </el-input>
            <el-button type="danger" text @click="$emit('delete')">
                <el-icon><Delete /></el-icon>
            </el-button>
        </div>
        <div v-if="parseError" class="parse-error">
            {{ parseError }}
        </div>
        <div v-if="expanded" class="cube-results-list">
            <div
                v-for="item in sortedCubeResults"
                :key="item.cubeId"
                class="cube-result-item"
            >
                <el-icon :size="16" :class="item.result?.passed ? 'pass' : 'fail'">
                    <CircleCheck v-if="item.result?.passed" />
                    <CircleClose v-else-if="item.result" />
                </el-icon>
                <span class="cube-name">{{ item.cubeName }}</span>
                <span v-if="item.result" class="result-value">
                    {{ item.result.lhsValue.toFixed(item.result.isPercentage ? 1 : 0) }}{{ item.result.isPercentage ? '%' : '' }}
                </span>
            </div>
        </div>
    </div>
</template>

<style scoped>
.check-condition-row {
    margin-bottom: 12px;
}
.condition-header {
    display: flex;
    align-items: center;
    gap: 8px;
}
.condition-header .el-input {
    flex: 1;
}
.condition-header :deep(.el-input-group__append) {
    cursor: pointer;
    user-select: none;
    min-width: 56px;
    text-align: center;
    font-weight: 600;
}
.condition-header .el-input.is-error :deep(.el-input__wrapper) {
    box-shadow: 0 0 0 1px var(--el-color-danger) inset;
}
.pass-count {
    font-variant-numeric: tabular-nums;
}
.parse-error {
    margin-top: 4px;
    font-size: 12px;
    color: var(--el-color-danger);
    padding-left: 12px;
}
.cube-results-list {
    margin-top: 8px;
    margin-left: 12px;
    max-height: 240px;
    overflow-y: auto;
}
.cube-result-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 4px 0;
    font-size: 14px;
}
.cube-result-item .pass { color: var(--el-color-success); }
.cube-result-item .fail { color: var(--el-color-danger); }
.cube-name { flex: 1; }
.result-value { color: var(--el-text-color-secondary); font-variant-numeric: tabular-nums; }
</style>
