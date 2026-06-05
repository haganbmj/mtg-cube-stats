<template>
    <div v-if="hasContent" class="preset-header">
        <img v-if="props.preset?.icon" :src="props.preset.icon" :alt="props.preset.label" class="preset-header-icon" />
        <div class="preset-header-content">
            <h3 class="preset-header-name">{{ props.preset!.label }}</h3>
            <p v-if="props.preset?.description" class="preset-header-description">{{ props.preset.description }}</p>
            <div v-if="props.preset?.links?.length" class="preset-header-links">
                <a
                    v-for="link in props.preset.links"
                    :key="link.url"
                    :href="link.url"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="preset-header-link"
                >
                    <component :is="linkIcon(link.type)" class="preset-header-link-icon" />
                    {{ link.label }}
                </a>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, type Component } from 'vue';
import type { PresetCollection, PresetLink } from '../presets';
import { Link, ChatDotRound, EditPen, Ticket, Promotion } from '@element-plus/icons-vue';

const props = defineProps({
    preset: {
        type: Object as () => PresetCollection | null,
        default: null,
    },
});

const hasContent = computed(() => {
    if (!props.preset) return false;
    return !!(props.preset.description || props.preset.icon || props.preset.links?.length);
});

function linkIcon(type?: PresetLink['type']): Component {
    switch (type) {
        case 'discord': return ChatDotRound;
        case 'signup': return EditPen;
        case 'voting': return Ticket;
        case 'bluesky': return Promotion;
        case 'website':
        default: return Link;
    }
}
</script>

<style scoped>
.preset-header {
    display: flex;
    align-items: flex-start;
    gap: 16px;
    padding: 12px 16px;
    margin-bottom: 12px;
}

.preset-header-icon {
    width: 48px;
    height: 48px;
    object-fit: contain;
    flex-shrink: 0;
}

.preset-header-content {
    flex: 1;
    min-width: 0;
}

.preset-header-name {
    margin: 0 0 4px 0;
    font-size: 1.1em;
    color: var(--el-text-color-primary);
}

.preset-header-description {
    margin: 0 0 8px 0;
    font-size: 0.9em;
    color: var(--el-text-color-regular);
}

.preset-header-links {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
}

.preset-header-link {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 0.85em;
    color: var(--el-color-primary);
    text-decoration: none;
}

.preset-header-link:hover {
    text-decoration: underline;
}

.preset-header-link-icon {
    width: 14px;
    height: 14px;
}
</style>
