<script setup lang="ts">
import { ref, computed, inject } from 'vue';
import type { Ref, ComputedRef } from 'vue';
import type { ChecksState, CheckCollection, CheckResult } from '../types/checks';
import type { Cube } from '../types/cube';
import CheckConditionRow from '../components/CheckConditionRow.vue';
import CheckSyntaxDialog from '../components/CheckSyntaxDialog.vue';

const props = defineProps<{
  loadedCubes: Record<string, Cube>;
}>();

const checksState = inject<Ref<ChecksState>>('checksState')!;
const checkResults = inject<ComputedRef<Map<string, Map<string, CheckResult>>>>('checkResults')!;

const showSyntaxDialog = ref(false);

const activeCollection = computed<CheckCollection | null>(() => {
  const id = checksState.value.activeCollectionId;
  if (!id) return null;
  return checksState.value.collections.find(c => c.id === id) ?? null;
});

function createCollection() {
  const newCollection: CheckCollection = {
    id: crypto.randomUUID(),
    name: 'New Collection',
    conditions: [],
  };
  checksState.value.collections.push(newCollection);
  checksState.value.activeCollectionId = newCollection.id;
}

function deleteCollection() {
  const id = checksState.value.activeCollectionId;
  if (!id) return;
  checksState.value.collections = checksState.value.collections.filter(c => c.id !== id);
  checksState.value.activeCollectionId = checksState.value.collections[0]?.id ?? null;
}

function addCondition() {
  if (!activeCollection.value) return;
  activeCollection.value.conditions.push({
    id: crypto.randomUUID(),
    expression: '',
  });
}

function deleteCondition(index: number) {
  if (!activeCollection.value) return;
  activeCollection.value.conditions.splice(index, 1);
}

function updateExpression(index: number, value: string) {
  if (!activeCollection.value) return;
  activeCollection.value.conditions[index].expression = value;
}

function getCubeResultsForCondition(conditionId: string) {
  return Object.entries(props.loadedCubes).map(([cubeId, cube]) => ({
    cubeId,
    cubeName: cube.name,
    result: checkResults.value.get(cubeId)?.get(conditionId),
  }));
}
</script>

<template>
    <div class="checks-tab">
        <!-- Collection Management -->
        <div class="collection-controls">
            <el-select
                v-if="checksState.collections.length > 0"
                :model-value="checksState.activeCollectionId"
                placeholder="Select collection"
                size="small"
                @update:model-value="checksState.activeCollectionId = $event"
            >
                <el-option
                    v-for="col in checksState.collections"
                    :key="col.id"
                    :label="col.name"
                    :value="col.id"
                />
            </el-select>
            <el-input
                v-if="activeCollection"
                :model-value="activeCollection.name"
                size="small"
                class="collection-name-input"
                @update:model-value="activeCollection!.name = $event"
            />
            <el-button size="small" @click="createCollection">New Collection</el-button>
            <el-button
                v-if="activeCollection"
                size="small"
                type="danger"
                text
                @click="deleteCollection"
            >
                Delete
            </el-button>
            <el-button size="small" text @click="showSyntaxDialog = true">
                <el-icon><QuestionFilled /></el-icon>
            </el-button>
        </div>

        <!-- Conditions List -->
        <div v-if="activeCollection" class="conditions-list">
            <CheckConditionRow
                v-for="(condition, index) in activeCollection.conditions"
                :key="condition.id"
                :condition="condition"
                :cube-results="getCubeResultsForCondition(condition.id)"
                @update:expression="updateExpression(index, $event)"
                @delete="deleteCondition(index)"
            />
            <el-button size="small" class="add-condition-btn" @click="addCondition">
                + Add Condition
            </el-button>
        </div>

        <!-- Empty State -->
        <div v-else-if="checksState.collections.length === 0" class="empty-state">
            <p>Create a check collection to define conditions cubes should meet.</p>
            <el-button @click="createCollection">Create Collection</el-button>
        </div>

        <CheckSyntaxDialog v-model:visible="showSyntaxDialog" />
    </div>
</template>

<style scoped>
.checks-tab {
  padding: 16px;
}
.collection-controls {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}
.collection-name-input {
  max-width: 200px;
}
.conditions-list {
  max-width: 800px;
}
.add-condition-btn {
  margin-top: 8px;
}
.empty-state {
  text-align: center;
  padding: 40px;
  color: var(--el-text-color-secondary);
}
</style>
