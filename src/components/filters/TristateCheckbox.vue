<template>
  <label
    class="tristate-checkbox"
    :class="{
      'is-include': modelValue === true,
      'is-exclude': modelValue === false,
      'is-neutral': modelValue === null,
    }"
    @click="cycle"
  >
    <span class="tristate-checkbox__input">
      <span class="tristate-checkbox__inner">
        <template v-if="modelValue === true">&#10003;</template>
        <template v-else-if="modelValue === false">&#10005;</template>
      </span>
    </span>
    <span class="tristate-checkbox__label"><slot /></span>
  </label>
</template>

<script setup lang="ts">
const props = defineProps({
    modelValue: {
        type: [Boolean, null] as any,
        default: null,
    },
});

const emit = defineEmits(['update:modelValue']);

const cycle = () => {
    // null -> true -> false -> null
    if (props.modelValue === null) emit('update:modelValue', true);
    else if (props.modelValue === true) emit('update:modelValue', false);
    else emit('update:modelValue', null);
};
</script>

<style scoped>
.tristate-checkbox {
  display: inline-flex;
  align-items: center;
  cursor: pointer;
  user-select: none;
  font-size: 14px;
  line-height: 1;
  margin-right: 16px;
  white-space: nowrap;
}

.tristate-checkbox__input {
  display: inline-flex;
  position: relative;
  white-space: nowrap;
  outline: none;
}

.tristate-checkbox__inner {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border: 1px solid var(--el-border-color);
  border-radius: 2px;
  background: var(--el-fill-color-blank);
  transition: border-color 0.15s, background-color 0.15s;
  font-size: 11px;
  line-height: 1;
  color: #fff;
}

.is-include .tristate-checkbox__inner {
  background-color: var(--el-color-success);
  border-color: var(--el-color-success);
}

.is-exclude .tristate-checkbox__inner {
  background-color: var(--el-color-danger);
  border-color: var(--el-color-danger);
}

.is-neutral .tristate-checkbox__inner {
  background-color: var(--el-fill-color-blank);
  border-color: var(--el-border-color);
}

.tristate-checkbox__label {
  padding-left: 8px;
  font-size: 14px;
  color: var(--el-text-color-regular);
}
</style>
