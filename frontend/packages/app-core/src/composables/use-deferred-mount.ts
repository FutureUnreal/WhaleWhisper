import { onMounted, ref } from "vue";

export function useDeferredMount() {
  const isReady = ref(false);

  onMounted(() => {
    requestAnimationFrame(() => {
      isReady.value = true;
    });
  });

  return {
    isReady,
  };
}
