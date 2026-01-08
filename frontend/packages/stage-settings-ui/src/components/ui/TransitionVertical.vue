<script setup lang="ts">
type TransitionElement = HTMLElement & { _height?: string };

function onEnter(el: Element) {
  const element = el as TransitionElement;
  element.style.height = "0";
  element.style.opacity = "0";
  element.style.overflow = "hidden";
  requestAnimationFrame(() => {
    element.style.height = `${element.scrollHeight}px`;
    element.style.opacity = "1";
  });
}

function onAfterEnter(el: Element) {
  const element = el as TransitionElement;
  element.style.height = "auto";
  element.style.overflow = "";
}

function onLeave(el: Element) {
  const element = el as TransitionElement;
  element.style.height = `${element.scrollHeight}px`;
  element.style.opacity = "1";
  element.style.overflow = "hidden";
  requestAnimationFrame(() => {
    element.style.height = "0";
    element.style.opacity = "0";
  });
}
</script>

<template>
  <Transition
    name="vertical"
    @enter="onEnter"
    @after-enter="onAfterEnter"
    @leave="onLeave"
  >
    <slot />
  </Transition>
</template>

<style scoped>
.vertical-enter-active,
.vertical-leave-active {
  transition: height 0.2s ease, opacity 0.2s ease;
}
</style>
