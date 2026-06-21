<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useDebounceFn } from '@vueuse/core';
import { ArrowDown, ArrowRight, Delete, CircleCheck, CircleClose } from '@element-plus/icons-vue';
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
            />
            <div class="condition-actions">
                <span class="pass-count">{{ passCount }}/{{ totalCount }}</span>
                <el-button
                    class="expand-btn"
                    text
                    :icon="expanded ? ArrowDown : ArrowRight"
                    @click="expanded = !expanded"
                />
                <el-button type="danger" text :icon="Delete" @click="$emit('delete')" />
            </div>
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
                    <template v-if="item.result.expressionType === 'relative'">
                        {{ item.result.lhsValue }} vs {{ item.result.rhsValue }}
                    </template>
                    <template v-else>
                        {{ item.result.lhsValue.toFixed(item.result.expressionType === 'aggregate' ? 2 : item.result.isPercentage ? 1 : 0) }}{{ item.result.isPercentage ? '%' : '' }}
                    </template>
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
.condition-header .el-input.is-error :deep(.el-input__wrapper) {
    box-shadow: 0 0 0 1px var(--el-color-danger) inset;
}
.condition-actions {
    display: flex;
    align-items: center;
    gap: 4px;
    flex-shrink: 0;
}
.pass-count {
    font-variant-numeric: tabular-nums;
    font-size: 14px;
    min-width: 40px;
    text-align: right;
}
.expand-btn {
    padding: 4px;
}
.parse-error {
    margin-top: 4px;
    font-size: 12px;
    color: var(--el-color-danger);
    padding-left: 12px;
}
.cube-results-list {
    margin-top: 8px;
    padding: 8px 12px;
    max-height: 240px;
    overflow-y: auto;
    background: var(--el-fill-color-lighter);
    border-radius: 4px;
    display: grid;
    grid-template-columns: 16px auto auto 1fr;
    column-gap: 8px;
    row-gap: 4px;
    align-items: center;
}
.cube-result-item {
    display: grid;
    grid-template-columns: subgrid;
    grid-column: 1 / -1;
    align-items: center;
    font-size: 14px;
}
.cube-result-item .pass { color: var(--el-color-success); }
.cube-result-item .fail { color: var(--el-color-danger); }
.cube-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.result-value { color: var(--el-text-color-secondary); font-variant-numeric: tabular-nums; text-align: center; padding-left: 8px; }
</style>
