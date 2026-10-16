<template>
    <el-tooltip
        v-if="imageUrl"
        placement="right"
        effect="light"
        popper-class="card-tooltip"
        :show-after="50"
        :hide-after="50"
        :enterable="false"
        :offset="16"
    >
        <template #content>
            <el-image
                :src="imageUrl"
                fit="contain"
                :alt="name"
                :class="setCode ? 'card-image ' + setCode.toLowerCase() : 'card-image'"
            />
        </template>
        <span>
            <el-link v-if="clickable" @click="$emit('click')">{{ name }}</el-link>
            <template v-else>{{ name }}</template>
            <template v-if="copies && copies >= 2"> &times;{{ copies }}</template>
        </span>
    </el-tooltip>
    <span v-else>
        <el-link v-if="clickable" @click="$emit('click')">{{ name }}</el-link>
        <template v-else>{{ name }}</template>
        <template v-if="copies && copies >= 2"> &times;{{ copies }}</template>
    </span>
</template>

<script setup lang="ts">
defineProps<{
    name: string;
    imageUrl?: string;
    setCode?: string;
    copies?: number;
    clickable?: boolean;
}>();

defineEmits<{
    (e: 'click'): void;
}>();
</script>
