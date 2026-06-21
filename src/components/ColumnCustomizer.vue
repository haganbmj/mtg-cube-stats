<template>
    <el-dialog
        :model-value="modelValue"
        @update:model-value="$emit('update:modelValue', $event)"
        title="Customize Columns"
        width="600"
        align-center
    >
        <div v-if="$slots.toggles" class="column-customizer-toggles">
            <slot name="toggles" />
            <el-divider />
        </div>

        <div class="column-customizer-list" style="max-height: 60vh; overflow-y: auto;">
            <draggable
                :model-value="columnOrder"
                @update:model-value="$emit('update:columnOrder', $event)"
                item-key="id"
                handle=".drag-handle"
                :animation="150"
            >
                <template #item="{ element, index }">
                    <div
                        class="column-customizer-row"
                        :class="{ 'column-customizer-row--hidden': !visibleColumns.includes(element) }"
                    >
                        <el-checkbox
                            :model-value="visibleColumns.includes(element)"
                            @change="toggleColumn(element, $event as boolean)"
                        />
                        <span class="column-customizer-label">
                            {{ columnMeta[element]?.label ?? element }}
                            <el-tooltip
                                v-if="columnMeta[element]?.tooltip"
                                :content="columnMeta[element].tooltip"
                                placement="top"
                                :hide-after="50"
                            >
                                <el-icon><InfoFilled /></el-icon>
                            </el-tooltip>
                        </span>
                        <span class="column-customizer-actions">
                            <el-button
                                :icon="ArrowUp"
                                size="small"
                                text
                                :disabled="index === 0"
                                @click="moveUp(index)"
                            />
                            <el-button
                                :icon="ArrowDown"
                                size="small"
                                text
                                :disabled="index === columnOrder.length - 1"
                                @click="moveDown(index)"
                            />
                            <el-icon class="drag-handle"><Rank /></el-icon>
                        </span>
                    </div>
                </template>
            </draggable>
        </div>

        <template #footer>
            <div class="column-customizer-footer">
                <el-button @click="handleReset">Reset to Default</el-button>
                <el-button type="primary" @click="$emit('update:modelValue', false)">Close</el-button>
            </div>
        </template>
    </el-dialog>
</template>

<script setup lang="ts">
import draggable from 'vuedraggable';
import { InfoFilled, ArrowUp, ArrowDown, Rank } from '@element-plus/icons-vue';

const props = defineProps<{
    modelValue: boolean;
    columnOrder: string[];
    visibleColumns: string[];
    columnMeta: Record<string, { label: string; tooltip?: string }>;
    defaultColumnOrder: string[];
    defaultVisibleColumns: string[];
}>();

const emit = defineEmits<{
    'update:modelValue': [value: boolean];
    'update:columnOrder': [value: string[]];
    'update:visibleColumns': [value: string[]];
}>();

function toggleColumn(key: string, checked: boolean) {
    if (checked) {
        emit('update:visibleColumns', [...props.visibleColumns, key]);
    } else {
        emit('update:visibleColumns', props.visibleColumns.filter(k => k !== key));
    }
}

function moveUp(index: number) {
    if (index === 0) return;
    const newOrder = [...props.columnOrder];
    [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
    emit('update:columnOrder', newOrder);
}

function moveDown(index: number) {
    if (index >= props.columnOrder.length - 1) return;
    const newOrder = [...props.columnOrder];
    [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
    emit('update:columnOrder', newOrder);
}

function handleReset() {
    emit('update:columnOrder', [...props.defaultColumnOrder]);
    emit('update:visibleColumns', [...props.defaultVisibleColumns]);
}
</script>

<style scoped>
.column-customizer-row {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 8px;
    border-radius: 4px;
    transition: background-color 0.15s;
}

.column-customizer-row:hover {
    background-color: var(--el-fill-color-light);
}

.column-customizer-row--hidden {
    opacity: 0.5;
}

.column-customizer-label {
    flex: 1;
    font-size: 14px;
    display: flex;
    align-items: center;
    gap: 4px;
}

.column-customizer-actions {
    display: flex;
    align-items: center;
    gap: 0;
}

.column-customizer-actions .el-button {
    margin: 0;
}

.drag-handle {
    cursor: grab;
    color: var(--el-text-color-placeholder);
    font-size: 16px;
    padding: 5px 7px;
}

.drag-handle:active {
    cursor: grabbing;
}

.column-customizer-footer {
    display: flex;
    justify-content: space-between;
    width: 100%;
}

.column-customizer-toggles {
    margin-bottom: 0;
}
</style>
