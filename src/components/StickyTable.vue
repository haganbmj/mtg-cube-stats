<template>
    <div ref="wrapperRef" class="sticky-table-wrapper">
    <table class="sticky-table" :class="{ 'sticky-table--striped': stripe }">
        <thead ref="theadRef" v-if="visibleColumns.length > 0" class="sticky-table__header" :style="theadStyle">
            <tr>
                <th v-if="expandable" class="sticky-table__th sticky-table__th--expand"></th>
                <th
                    v-for="col in visibleColumns"
                    :key="col.key"
                    class="sticky-table__th"
                    :class="{
                        'is-sortable': col.sortable,
                        'is-center': col.align === 'center',
                        'is-right': col.align === 'right',
                    }"
                    :style="columnStyle(col)"
                    @click="col.sortable && toggleSort(col)"
                >
                    <div class="sticky-table__header-cell">
                        <slot :name="`header-${col.key}`" :column="col">
                            <el-tooltip
                                v-if="col.tooltip"
                                :content="col.tooltip"
                                placement="top"
                                :hide-after="50"
                            >
                                <span>{{ col.label }} <el-icon><InfoFilled /></el-icon></span>
                            </el-tooltip>
                            <span v-else>{{ col.label }}</span>
                        </slot>
                        <span v-if="col.sortable" class="sticky-table__sort-wrapper">
                            <i
                                class="sticky-table__sort-caret sticky-table__sort-caret--asc"
                                :class="{ 'is-active': isSortActive(col, 'ascending') }"
                            ></i>
                            <i
                                class="sticky-table__sort-caret sticky-table__sort-caret--desc"
                                :class="{ 'is-active': isSortActive(col, 'descending') }"
                            ></i>
                        </span>
                    </div>
                </th>
            </tr>
        </thead>
        <tbody>
            <template v-for="(row, rowIndex) in data" :key="rowKey ? resolveValue(row, rowKey) : rowIndex">
                <tr
                    class="sticky-table__row"
                    :class="{
                        'sticky-table__row--striped': stripe && rowIndex % 2 === 1,
                        'sticky-table__row--hover': hoverRowIndex === rowIndex,
                    }"
                    @mouseenter="hoverRowIndex = rowIndex"
                    @mouseleave="hoverRowIndex = -1"
                >
                    <td v-if="expandable" class="sticky-table__td sticky-table__td--expand">
                        <button
                            class="sticky-table__expand-btn"
                            :class="{ 'is-expanded': expandedRows.has(rowIndex) }"
                            @click.stop="toggleExpand(rowIndex)"
                        >
                            <svg viewBox="0 0 1024 1024" width="12" height="12">
                                <path d="M384 192l384 320-384 320z" fill="currentColor" />
                            </svg>
                        </button>
                    </td>
                    <td
                        v-for="col in visibleColumns"
                        :key="col.key"
                        class="sticky-table__td"
                        :class="{
                            'is-center': col.align === 'center',
                            'is-right': col.align === 'right',
                        }"
                    >
                        <div
                            class="sticky-table__cell"
                            :class="{ 'sticky-table__cell--overflow': col.showOverflowTooltip }"
                            :title="col.showOverflowTooltip ? String(formatCell(row, col)) : undefined"
                        >
                            <slot :name="`cell-${col.key}`" :row="row" :column="col" :rowIndex="rowIndex">
                                {{ formatCell(row, col) }}
                            </slot>
                        </div>
                    </td>
                </tr>
                <tr v-if="expandable && expandedRows.has(rowIndex)" class="sticky-table__expand-row">
                    <td :colspan="visibleColumns.length + 1">
                        <div class="sticky-table__expand-content">
                            <slot name="expand" :row="row" :rowIndex="rowIndex"></slot>
                        </div>
                    </td>
                </tr>
            </template>
            <tr v-if="!data || data.length === 0">
                <td :colspan="(expandable ? 1 : 0) + visibleColumns.length" class="sticky-table__empty">
                    <slot name="empty">No data</slot>
                </td>
            </tr>
        </tbody>
    </table>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { InfoFilled } from '@element-plus/icons-vue';
import type { StickyTableColumn } from '../types/StickyTableColumn';

const props = defineProps({
    data: {
        type: Array as () => any[],
        required: true,
    },
    columns: {
        type: Array as () => StickyTableColumn[],
        required: true,
    },
    defaultSort: {
        type: Object as () => { prop: string; order: 'ascending' | 'descending' } | null,
        default: null,
    },
    stripe: {
        type: Boolean,
        default: false,
    },
    expandable: {
        type: Boolean,
        default: false,
    },
    rowKey: {
        type: String,
        default: '',
    },
});

const emit = defineEmits<{
    'sort-change': [payload: { prop: string; order: 'ascending' | 'descending' | null }];
}>();

const sortState = ref<{ prop: string; order: 'ascending' | 'descending' | null }>({
    prop: props.defaultSort?.prop ?? '',
    order: props.defaultSort?.order ?? null,
});

const expandedRows = ref(new Set<number>());
const hoverRowIndex = ref(-1);

// --- Sticky header via JS transform (CSS sticky doesn't work with overflow-x: auto) ---
const wrapperRef = ref<HTMLElement>();
const theadRef = ref<HTMLElement>();
const stickyOffset = ref(0);

const theadStyle = computed(() => {
    if (stickyOffset.value > 0) {
        return {
            transform: `translateY(${stickyOffset.value}px)`,
            willChange: 'transform',
        };
    }
    return {};
});

const updateStickyHeader = () => {
    if (!wrapperRef.value || !theadRef.value || window.innerWidth <= 760) {
        stickyOffset.value = 0;
        return;
    }
    const rect = wrapperRef.value.getBoundingClientRect();
    const headerHeight = theadRef.value.offsetHeight;
    if (rect.top < 0 && rect.bottom > headerHeight) {
        stickyOffset.value = Math.round(-rect.top);
    } else {
        stickyOffset.value = 0;
    }
};

onMounted(() => {
    window.addEventListener('scroll', updateStickyHeader, { passive: true });
    window.addEventListener('resize', updateStickyHeader, { passive: true });
});

onUnmounted(() => {
    window.removeEventListener('scroll', updateStickyHeader);
    window.removeEventListener('resize', updateStickyHeader);
});

const visibleColumns = computed(() => {
    return props.columns.filter(col => col.visible !== false);
});

const resolveValue = (obj: any, path: string): any => {
    return path.split('.').reduce((acc, key) => acc?.[key], obj);
};

const formatCell = (row: any, col: StickyTableColumn): string => {
    if (col.formatter) return col.formatter(row);
    const val = resolveValue(row, col.prop ?? col.key);
    return val ?? '';
};

const columnStyle = (col: StickyTableColumn): Record<string, string> => {
    const style: Record<string, string> = {};
    if (col.width) style.width = col.width;
    if (col.minWidth) style.minWidth = col.minWidth;
    return style;
};

const isSortActive = (col: StickyTableColumn, order: string): boolean => {
    const sortProp = col.sortKey ?? col.prop ?? col.key;
    return sortState.value.prop === sortProp && sortState.value.order === order;
};

const toggleSort = (col: StickyTableColumn) => {
    const sortProp = col.sortKey ?? col.prop ?? col.key;
    if (sortState.value.prop === sortProp) {
        if (sortState.value.order === 'ascending') {
            sortState.value = { prop: sortProp, order: 'descending' };
        } else if (sortState.value.order === 'descending') {
            sortState.value = { prop: '', order: null };
        } else {
            sortState.value = { prop: sortProp, order: 'ascending' };
        }
    } else {
        sortState.value = { prop: sortProp, order: 'ascending' };
    }
    emit('sort-change', { ...sortState.value });
};

const toggleExpand = (rowIndex: number) => {
    const newSet = new Set(expandedRows.value);
    if (newSet.has(rowIndex)) {
        newSet.delete(rowIndex);
    } else {
        newSet.add(rowIndex);
    }
    expandedRows.value = newSet;
};
</script>

<style lang="scss">
.sticky-table-wrapper {
    overflow-x: auto;
    overflow-y: clip;
}

.sticky-table {
    width: 100%;
    table-layout: auto;
    border-collapse: separate;
    border-spacing: 0;
    font-size: var(--el-font-size-base);
    color: var(--el-text-color-regular);
    background-color: var(--el-bg-color);
}

.sticky-table__header {
    position: relative;
    z-index: 10;
}

.sticky-table__th {
    background-color: var(--el-table-header-bg-color, #141414);
    color: var(--el-text-color-secondary);
    font-weight: 600;
    border-bottom: 1px solid var(--el-border-color-lighter);
    padding: 8px 0;
    text-align: left;
    white-space: nowrap;

    &.is-sortable {
        cursor: pointer;
        user-select: none;
    }

    &.is-center {
        text-align: center;
    }

    &.is-right {
        text-align: right;
    }
}

.sticky-table__th--expand {
    width: 40px;
    min-width: 40px;
}

.sticky-table__header-cell {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 0 12px;
}

.sticky-table__sort-wrapper {
    display: inline-flex;
    flex-direction: column;
    align-items: center;
    width: 24px;
    height: 14px;
    position: relative;
    vertical-align: middle;
}

.sticky-table__sort-caret {
    width: 0;
    height: 0;
    border: 5px solid transparent;
    position: absolute;
    left: 7px;

    &--asc {
        border-bottom-color: var(--el-text-color-placeholder);
        top: -5px;

        &.is-active {
            border-bottom-color: var(--el-color-primary);
        }
    }

    &--desc {
        border-top-color: var(--el-text-color-placeholder);
        bottom: -3px;

        &.is-active {
            border-top-color: var(--el-color-primary);
        }
    }
}

.sticky-table__row {
    background-color: var(--el-bg-color);
    transition: background-color 0.25s;

    &--striped {
        background-color: var(--el-fill-color-lighter);
    }

    &--hover {
        background-color: var(--el-fill-color-light);
    }
}

.sticky-table__td {
    border-bottom: 1px solid var(--el-border-color-lighter);
    padding: 8px 0;

    &.is-center {
        text-align: center;
    }

    &.is-right {
        text-align: right;
    }
}

.sticky-table__td--expand {
    width: 40px;
    min-width: 40px;
    text-align: center;
}

.sticky-table__cell {
    position: relative;
    padding: 0 12px;
    line-height: 23px;
    overflow-wrap: break-word;

    &--overflow {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
}

.sticky-table__expand-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    background: transparent;
    border: none;
    padding: 4px;
    border-radius: var(--el-border-radius-base);
    color: var(--el-text-color-regular);
    transition: transform 0.15s ease-in-out;

    &.is-expanded {
        transform: rotate(90deg);
    }

    &:hover {
        color: var(--el-color-primary);
    }
}

.sticky-table__expand-row td {
    background-color: var(--el-bg-color);
    padding: 20px 50px;
}

.sticky-table__expand-content {
    padding: 0;
}

.sticky-table__empty {
    text-align: center;
    padding: 20px;
    color: var(--el-text-color-secondary);
}
</style>
