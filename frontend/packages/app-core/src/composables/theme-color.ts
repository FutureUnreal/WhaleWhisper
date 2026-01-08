import type { Ref } from "vue";

import type { BackgroundItem } from "../stores/background";

import { watch } from "vue";

import { useTheme } from "./use-theme";

export function useThemeColor(colorFrom: () => string | Promise<string>) {
  async function updateThemeColor(override?: string) {
    if (!("document" in globalThis)) {
      return;
    }

    const color = override ?? (await colorFrom());
    const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    if (meta) {
      meta.setAttribute("content", color);
    }
  }

  return {
    updateThemeColor,
  };
}

export function useBackgroundThemeColor({
  backgroundSurface,
  selectedOption,
  sampledColor,
}: {
  backgroundSurface: Ref<
    { surfaceEl?: { value?: HTMLElement | null } | HTMLElement | null } | undefined | null
  >;
  selectedOption: Ref<BackgroundItem | undefined>;
  sampledColor: Ref<string>;
}) {
  const { isDark } = useTheme();
  const { updateThemeColor } = useThemeColor(() => sampledColor.value);

  async function syncBackgroundTheme() {
    const accent = selectedOption.value?.accent || sampledColor.value;
    if (accent) {
      sampledColor.value = accent;
      await updateThemeColor(accent);
    }
  }

  watch([selectedOption, sampledColor, isDark], () => {
    void syncBackgroundTheme();
  }, { immediate: true });

  watch(() => backgroundSurface.value?.surfaceEl, () => {
    void syncBackgroundTheme();
  });

  return {
    sampledColor,
    syncBackgroundTheme,
  };
}
