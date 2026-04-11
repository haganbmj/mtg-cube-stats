<template>
    <el-popover
        v-model:visible="popoverVisible"
        placement="bottom-start"
        :width="280"
        trigger="click"
        :teleported="true"
    >
        <template #reference>
            <div class="tristate-select" :class="{ 'is-active': popoverVisible }">
                <div class="tristate-select__tags" v-if="includedEntries.length || excludedEntries.length">
                    <el-tag
                        v-for="entry in includedEntries"
                        :key="'inc-' + entry.value"
                        size="small"
                        type="success"
                        closable
                        disable-transitions
                        @close="clearEntry(entry.value)"
                    >
                        {{ entry.label }}
                    </el-tag>
                    <el-tag
                        v-for="entry in excludedEntries"
                        :key="'exc-' + entry.value"
                        size="small"
                        type="danger"
                        closable
                        disable-transitions
                        @close="clearEntry(entry.value)"
                    >
                        {{ entry.label }}
                    </el-tag>
                </div>
                <span v-else class="tristate-select__placeholder">{{ placeholder }}</span>
                <el-icon class="tristate-select__arrow"><ArrowDown /></el-icon>
            </div>
        </template>

        <div class="tristate-select-popover">
            <el-input
                v-if="filterable"
                v-model="searchQuery"
                placeholder="Search..."
                clearable
                size="small"
                class="tristate-select-popover__search"
            >
                <template #prefix>
                    <el-icon><Search /></el-icon>
                </template>
            </el-input>
            <div class="tristate-select-popover__list">
                <TristateCheckbox
                    v-for="opt in filteredOptions"
                    :key="opt.value"
                    :modelValue="modelValue[opt.value] ?? null"
                    @update:modelValue="onUpdate(opt.value, $event)"
                    class="tristate-select-popover__item"
                >
                    {{ opt.label }}
                </TristateCheckbox>
                <div v-if="filteredOptions.length === 0" class="tristate-select-popover__empty">
                    No matching options
                </div>
            </div>
        </div>
    </el-popover>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { Search, ArrowDown } from '@element-plus/icons-vue';
import TristateCheckbox from './TristateCheckbox.vue';

const props = defineProps({
    modelValue: {
        type: Object,
        default: () => ({}),
    },
    options: {
        type: Array,
        default: () => [],
    },
    placeholder: {
        type: String,
        default: 'Select...',
    },
    filterable: {
        type: Boolean,
        default: true,
    },
});

const emit = defineEmits(['update:modelValue']);

const popoverVisible = ref(false);
const searchQuery = ref('');

const filteredOptions = computed(() => {
    if (!searchQuery.value) return props.options;
    const q = searchQuery.value.toLowerCase();
    return props.options.filter((opt: any) => {
        if (opt.searchTerms) return opt.searchTerms.some((t: string) => t.includes(q));
        return opt.label.toLowerCase().includes(q);
    });
});

const includedEntries = computed(() => {
    return props.options.filter((opt: any) => props.modelValue[opt.value] === true);
});

const excludedEntries = computed(() => {
    return props.options.filter((opt: any) => props.modelValue[opt.value] === false);
});

const onUpdate = (key: string, value: boolean | null) => {
    const next = { ...props.modelValue };
    if (value === null) {
        delete next[key];
    } else {
        next[key] = value;
    }
    emit('update:modelValue', next);
};

const clearEntry = (key: string) => {
    const next = { ...props.modelValue };
    delete next[key];
    emit('update:modelValue', next);
};
</script>

<style scoped>
.tristate-select {
  display: flex;
  align-items: center;
  box-sizing: border-box;
  min-height: 32px;
  padding: 2px 8px;
  border: 1px solid var(--el-border-color);
  border-radius: var(--el-border-radius-base);
  background: var(--el-fill-color-blank);
  cursor: pointer;
  transition: border-color 0.2s;
  gap: 4px;
}

.tristate-select:hover,
.tristate-select.is-active {
  border-color: var(--el-color-primary);
}

.tristate-select__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  flex: 1;
  min-width: 0;
}

.tristate-select__placeholder {
  flex: 1;
  color: var(--el-text-color-placeholder);
  font-size: 14px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tristate-select__arrow {
  flex-shrink: 0;
  color: var(--el-text-color-placeholder);
  font-size: 14px;
  margin-left: 4px;
  transition: transform 0.2s;
}

.tristate-select.is-active .tristate-select__arrow {
  transform: rotate(180deg);
}

.tristate-select-popover__search {
  margin-bottom: 8px;
}

.tristate-select-popover__list {
  max-height: 240px;
  overflow-y: auto;
}

.tristate-select-popover__item {
  display: flex;
  width: 100%;
  padding: 4px 0;
}

.tristate-select-popover__empty {
  padding: 8px 0;
  text-align: center;
  color: var(--el-text-color-secondary);
  font-size: 13px;
}
</style>
