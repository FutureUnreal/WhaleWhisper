<script setup lang="ts">
const modelValue = defineModel<number>({ required: true });

const props = withDefaults(
  defineProps<{
    min: number;
    max: number;
    step?: number;
  }>(),
  {
    step: 1,
  }
);
</script>

<template>
  <input
    v-model.number="modelValue"
    type="range"
    :min="props.min"
    :max="props.max"
    :step="props.step"
    class="vertical-range"
  >
</template>

<style scoped>
.vertical-range {
  width: 2.5rem;
  height: 12rem;
  accent-color: var(--un-preset-primary, #8b5cf6);
  writing-mode: vertical-lr;
  direction: rtl;
}

@supports not (writing-mode: vertical-lr) {
  .vertical-range {
    width: 12rem;
    height: 2.5rem;
    transform: rotate(-90deg);
  }
}
</style>
