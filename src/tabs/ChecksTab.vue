<script setup lang="ts">
import { ref, computed, inject } from 'vue';
import type { Ref, ComputedRef } from 'vue';
import { Delete } from '@element-plus/icons-vue';
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
const addDialogVisible = ref(false);
const addDialogName = ref('');
const editDialogVisible = ref(false);

const activeCollection = computed<CheckCollection | null>(() => {
  const id = checksState.value.activeCollectionId;
  if (!id) return null;
  return checksState.value.collections.find(c => c.id === id) ?? null;
});

function createCollection() {
  const name = addDialogName.value.trim();
  if (!name) return;
  const newCollection: CheckCollection = {
    id: crypto.randomUUID(),
    name,
    conditions: [],
  };
  checksState.value.collections.push(newCollection);
  checksState.value.activeCollectionId = newCollection.id;
  addDialogName.value = '';
  addDialogVisible.value = false;
}

function deleteCollection(id: string) {
  checksState.value.collections = checksState.value.collections.filter(c => c.id !== id);
  if (checksState.value.activeCollectionId === id) {
    checksState.value.activeCollectionId = checksState.value.collections[0]?.id ?? null;
  }
}

function renameCollection(id: string, name: string) {
  const col = checksState.value.collections.find(c => c.id === id);
  if (col) col.name = name;
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
        <!-- Toolbar (only when collections exist) -->
        <div v-if="checksState.collections.length > 0" class="collection-toolbar">
            <div class="collection-row">
                <el-select
                    :model-value="checksState.activeCollectionId"
                    placeholder="Select collection"
                    class="collection-select"
                    @update:model-value="checksState.activeCollectionId = $event"
                >
                    <template #footer>
                        <div class="collection-select-footer">
                            <el-button text bg type="success" size="small" @click.stop="addDialogVisible = true">Add</el-button>
                            <el-divider direction="vertical" />
                            <el-button text bg size="small" @click.stop="editDialogVisible = true">Edit</el-button>
                        </div>
                    </template>
                    <el-option
                        v-for="col in checksState.collections"
                        :key="col.id"
                        :label="col.name"
                        :value="col.id"
                    />
                </el-select>
                <div class="toolbar-spacer" />
                <el-button @click="showSyntaxDialog = true">Syntax Help</el-button>
            </div>
        </div>

        <!-- Conditions List -->
        <div v-if="activeCollection" class="conditions-list">
            <h4 class="conditions-heading">Conditions</h4>
            <CheckConditionRow
                v-for="(condition, index) in activeCollection.conditions"
                :key="condition.id"
                :condition="condition"
                :cube-results="getCubeResultsForCondition(condition.id)"
                @update:expression="updateExpression(index, $event)"
                @delete="deleteCondition(index)"
            />
            <el-button @click="addCondition">
                + Add Condition
            </el-button>
        </div>

        <!-- Empty State (no collections at all) -->
        <div v-else-if="checksState.collections.length === 0" class="empty-state">
            <p>Create a check collection to define conditions cubes should meet.</p>
            <el-button @click="addDialogVisible = true">Create Collection</el-button>
        </div>

        <!-- Add Collection Dialog -->
        <el-dialog
            v-model="addDialogVisible"
            title="Add Collection"
            width="400"
            align-center
            destroy-on-close
        >
            <el-input
                v-model="addDialogName"
                placeholder="Collection name"
                maxlength="60"
                show-word-limit
                @keyup.enter="createCollection"
            />
            <template #footer>
                <el-button @click="addDialogVisible = false">Cancel</el-button>
                <el-button type="primary" :disabled="!addDialogName.trim()" @click="createCollection">Add</el-button>
            </template>
        </el-dialog>

        <!-- Edit Collections Dialog -->
        <el-dialog
            v-model="editDialogVisible"
            title="Edit Collections"
            width="400"
            align-center
            destroy-on-close
        >
            <el-empty v-if="checksState.collections.length === 0" description="No collections" :image-size="60" />
            <ul v-else class="collection-edit-list">
                <li v-for="col in checksState.collections" :key="col.id" class="collection-edit-item">
                    <el-input
                        :model-value="col.name"
                        size="small"
                        @update:model-value="renameCollection(col.id, $event)"
                    />
                    <el-button link type="danger" @click="deleteCollection(col.id)">
                        <el-icon><Delete /></el-icon>
                    </el-button>
                </li>
            </ul>
            <template #footer>
                <el-button @click="editDialogVisible = false">Close</el-button>
            </template>
        </el-dialog>

        <CheckSyntaxDialog v-model:visible="showSyntaxDialog" />
    </div>
</template>

<style scoped>
.checks-tab {
    max-width: 900px;
    margin: 0 auto;
    width: 100%;
    padding: 16px;
}
.collection-toolbar {
    margin-bottom: 20px;
}
.collection-row {
    display: flex;
    align-items: center;
    gap: 10px;
}
.collection-select {
    width: 200px;
}
.collection-select-footer {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
}
.toolbar-spacer {
    flex: 1;
}
.conditions-heading {
    font-size: 14px;
    font-weight: 600;
    color: var(--el-text-color-regular);
    margin-bottom: 12px;
}
.conditions-list {
    max-width: 100%;
}
.empty-state {
    text-align: center;
    padding: 60px 20px;
    color: var(--el-text-color-secondary);
    font-size: 14px;
}
.collection-edit-list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
}
.collection-edit-item {
    display: flex;
    align-items: center;
    gap: 8px;
}
.collection-edit-item .el-input {
    flex: 1;
}
</style>
