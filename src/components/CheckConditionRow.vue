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
            />
            <el-tooltip v-if="parseError" :content="parseError" placement="top">
                <el-icon class="error-icon"><Warning /></el-icon>
            </el-tooltip>
            <span class="pass-badge" @click="expanded = !expanded">
                {{ passCount }}/{{ totalCount }}
                <el-icon :class="{ expanded }"><ArrowRight /></el-icon>
            </span>
            <el-button text type="danger" @click="$emit('delete')">
                <el-icon><Delete /></el-icon>
            </el-button>
        </div>
        <div v-if="expanded" class="cube-results-list">
            <div
                v-for="item in sortedCubeResults"
                :key="item.cubeId"
                class="cube-result-item"
            >
                <el-icon :class="item.result?.passed ? 'pass' : 'fail'">
                    <component :is="item.result?.passed ? 'CircleCheck' : 'CircleClose'" />
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
  margin-bottom: 8px;
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
.error-icon {
  color: var(--el-color-danger);
}
.pass-badge {
  cursor: pointer;
  white-space: nowrap;
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 2px;
}
.pass-badge .el-icon {
  transition: transform 0.2s;
}
.pass-badge .el-icon.expanded {
  transform: rotate(90deg);
}
.cube-results-list {
  margin-top: 4px;
  margin-left: 12px;
  max-height: 200px;
  overflow-y: auto;
}
.cube-result-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 2px 0;
  font-size: 12px;
}
.cube-result-item .pass { color: var(--el-color-success); }
.cube-result-item .fail { color: var(--el-color-danger); }
.cube-name { flex: 1; }
.result-value { color: var(--el-text-color-secondary); }
</style>
