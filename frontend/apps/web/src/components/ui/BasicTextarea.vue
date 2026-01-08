<script setup lang="ts">
const modelValue = defineModel<string>({ default: "" });

const props = withDefaults(
  defineProps<{
    placeholder?: string;
    submitOnEnter?: boolean;
  }>(),
  {
    placeholder: "",
    submitOnEnter: true,
  }
);

const emit = defineEmits<{
  (e: "submit"): void;
}>();

function onKeydown(event: KeyboardEvent) {
  if (props.submitOnEnter && event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    emit("submit");
  }
}
</script>

<template>
  <textarea
    v-model="modelValue"
    :placeholder="props.placeholder"
    @keydown="onKeydown"
  />
</template>
