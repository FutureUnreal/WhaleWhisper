import { useLocalStorage } from "@vueuse/core";
import { defineStore } from "pinia";
import { computed, ref } from "vue";

export enum BackgroundKind {
  Wave = "wave",
  Gradient = "gradient",
  Image = "image",
}

export interface BackgroundItem {
  id: string;
  label: string;
  description?: string;
  kind: BackgroundKind;
  gradient?: string;
  gradientLight?: string;
  gradientDark?: string;
  src?: string;
  accent?: string;
  glow?: string;
  blur?: boolean;
}

const presets: BackgroundItem[] = [
  {
    id: "colorful-wave",
    label: "Data Flow",
    description: "Whale swimming in data streams",
    kind: BackgroundKind.Wave,
    accent: "#00b4ff",
  },
  {
    id: "ocean",
    label: "Deep Learning",
    kind: BackgroundKind.Gradient,
    gradientDark: `
      repeating-linear-gradient(90deg, 
        transparent 0px, 
        transparent 79px, 
        rgba(0, 180, 255, 0.03) 79px, 
        rgba(0, 180, 255, 0.03) 80px
      ),
      repeating-linear-gradient(0deg, 
        transparent 0px, 
        transparent 79px, 
        rgba(0, 180, 255, 0.03) 79px, 
        rgba(0, 180, 255, 0.03) 80px
      ),
      radial-gradient(ellipse 100% 60% at 30% 20%, 
        rgba(0, 100, 200, 0.15) 0%, 
        transparent 50%
      ),
      radial-gradient(ellipse 80% 50% at 70% 60%, 
        rgba(0, 150, 255, 0.12) 0%, 
        transparent 45%
      ),
      radial-gradient(circle at 50% 80%, 
        rgba(0, 180, 255, 0.08) 0%, 
        transparent 40%
      ),
      linear-gradient(180deg, 
        rgba(2, 8, 23, 1) 0%, 
        rgba(5, 15, 35, 1) 50%,
        rgba(8, 22, 45, 1) 100%
      )
    `,
    gradientLight: `
      repeating-linear-gradient(90deg, 
        transparent 0px, 
        transparent 79px, 
        rgba(0, 120, 200, 0.08) 79px, 
        rgba(0, 120, 200, 0.08) 80px
      ),
      repeating-linear-gradient(0deg, 
        transparent 0px, 
        transparent 79px, 
        rgba(0, 120, 200, 0.08) 79px, 
        rgba(0, 120, 200, 0.08) 80px
      ),
      radial-gradient(ellipse 100% 60% at 30% 20%, 
        rgba(100, 180, 255, 0.25) 0%, 
        transparent 50%
      ),
      radial-gradient(ellipse 80% 50% at 70% 60%, 
        rgba(120, 200, 255, 0.2) 0%, 
        transparent 45%
      ),
      radial-gradient(circle at 50% 80%, 
        rgba(140, 210, 255, 0.15) 0%, 
        transparent 40%
      ),
      linear-gradient(180deg, 
        rgba(240, 248, 255, 1) 0%, 
        rgba(230, 242, 252, 1) 50%,
        rgba(220, 235, 250, 1) 100%
      )
    `,
    accent: "#00b4ff",
    glow: "rgba(0, 180, 255, 0.5)",
  },
  {
    id: "midnight",
    label: "Neural Network",
    kind: BackgroundKind.Gradient,
    gradientDark: `
      radial-gradient(ellipse 3px 40px at 15% 25%, rgba(100, 255, 180, 0.4) 0%, transparent 100%),
      radial-gradient(ellipse 3px 35px at 35% 15%, rgba(100, 255, 180, 0.35) 0%, transparent 100%),
      radial-gradient(ellipse 3px 45px at 55% 35%, rgba(100, 255, 180, 0.38) 0%, transparent 100%),
      radial-gradient(ellipse 3px 30px at 75% 20%, rgba(100, 255, 180, 0.32) 0%, transparent 100%),
      radial-gradient(ellipse 3px 50px at 85% 45%, rgba(100, 255, 180, 0.4) 0%, transparent 100%),
      radial-gradient(ellipse 3px 38px at 25% 60%, rgba(100, 255, 180, 0.36) 0%, transparent 100%),
      radial-gradient(ellipse 3px 42px at 45% 70%, rgba(100, 255, 180, 0.42) 0%, transparent 100%),
      radial-gradient(ellipse 3px 35px at 65% 65%, rgba(100, 255, 180, 0.34) 0%, transparent 100%),
      radial-gradient(ellipse 3px 48px at 80% 75%, rgba(100, 255, 180, 0.4) 0%, transparent 100%),
      radial-gradient(circle 4px at 15% 25%, rgba(100, 255, 180, 0.9) 0%, transparent 100%),
      radial-gradient(circle 3px at 35% 15%, rgba(100, 255, 180, 0.85) 0%, transparent 100%),
      radial-gradient(circle 4px at 55% 35%, rgba(100, 255, 180, 0.88) 0%, transparent 100%),
      radial-gradient(circle 3px at 75% 20%, rgba(100, 255, 180, 0.82) 0%, transparent 100%),
      radial-gradient(circle 4px at 85% 45%, rgba(100, 255, 180, 0.9) 0%, transparent 100%),
      radial-gradient(circle 3px at 25% 60%, rgba(100, 255, 180, 0.8) 0%, transparent 100%),
      radial-gradient(circle 4px at 45% 70%, rgba(100, 255, 180, 0.92) 0%, transparent 100%),
      radial-gradient(circle 3px at 65% 65%, rgba(100, 255, 180, 0.84) 0%, transparent 100%),
      radial-gradient(circle 4px at 80% 75%, rgba(100, 255, 180, 0.88) 0%, transparent 100%),
      radial-gradient(ellipse 120% 80% at 50% 50%, 
        rgba(20, 60, 50, 0.15) 0%, 
        transparent 60%
      ),
      linear-gradient(180deg, 
        rgba(5, 15, 20, 1) 0%, 
        rgba(8, 20, 28, 1) 50%,
        rgba(10, 25, 32, 1) 100%
      )
    `,
    gradientLight: `
      radial-gradient(ellipse 3px 40px at 15% 25%, rgba(0, 180, 120, 0.3) 0%, transparent 100%),
      radial-gradient(ellipse 3px 35px at 35% 15%, rgba(0, 180, 120, 0.25) 0%, transparent 100%),
      radial-gradient(ellipse 3px 45px at 55% 35%, rgba(0, 180, 120, 0.28) 0%, transparent 100%),
      radial-gradient(ellipse 3px 30px at 75% 20%, rgba(0, 180, 120, 0.22) 0%, transparent 100%),
      radial-gradient(ellipse 3px 50px at 85% 45%, rgba(0, 180, 120, 0.3) 0%, transparent 100%),
      radial-gradient(ellipse 3px 38px at 25% 60%, rgba(0, 180, 120, 0.26) 0%, transparent 100%),
      radial-gradient(ellipse 3px 42px at 45% 70%, rgba(0, 180, 120, 0.32) 0%, transparent 100%),
      radial-gradient(ellipse 3px 35px at 65% 65%, rgba(0, 180, 120, 0.24) 0%, transparent 100%),
      radial-gradient(ellipse 3px 48px at 80% 75%, rgba(0, 180, 120, 0.3) 0%, transparent 100%),
      radial-gradient(circle 4px at 15% 25%, rgba(0, 200, 140, 0.7) 0%, transparent 100%),
      radial-gradient(circle 3px at 35% 15%, rgba(0, 200, 140, 0.65) 0%, transparent 100%),
      radial-gradient(circle 4px at 55% 35%, rgba(0, 200, 140, 0.68) 0%, transparent 100%),
      radial-gradient(circle 3px at 75% 20%, rgba(0, 200, 140, 0.62) 0%, transparent 100%),
      radial-gradient(circle 4px at 85% 45%, rgba(0, 200, 140, 0.7) 0%, transparent 100%),
      radial-gradient(circle 3px at 25% 60%, rgba(0, 200, 140, 0.6) 0%, transparent 100%),
      radial-gradient(circle 4px at 45% 70%, rgba(0, 200, 140, 0.72) 0%, transparent 100%),
      radial-gradient(circle 3px at 65% 65%, rgba(0, 200, 140, 0.64) 0%, transparent 100%),
      radial-gradient(circle 4px at 80% 75%, rgba(0, 200, 140, 0.68) 0%, transparent 100%),
      radial-gradient(ellipse 120% 80% at 50% 50%, 
        rgba(100, 200, 160, 0.12) 0%, 
        transparent 60%
      ),
      linear-gradient(180deg, 
        rgba(238, 250, 245, 1) 0%, 
        rgba(230, 245, 240, 1) 50%,
        rgba(220, 240, 235, 1) 100%
      )
    `,
    accent: "#64ffb4",
    glow: "rgba(100, 255, 180, 0.45)",
  },
];

export const useBackgroundStore = defineStore("background", () => {
  const customBackgrounds = useLocalStorage<BackgroundItem[]>(
    "whalewhisper/background/custom-backgrounds",
    []
  );
  
  const options = computed(() => [...presets, ...customBackgrounds.value]);
  
  const selectedId = useLocalStorage<string>(
    "whalewhisper/background/selected-id",
    options.value[0]?.id
  );
  const sampledColor = useLocalStorage<string>(
    "whalewhisper/background/sampled-color",
    options.value[0]?.accent || "#3a88ff"
  );

  const selectedOption = computed(
    () => options.value.find((option) => option.id === selectedId.value) || options.value[0]
  );

  function setSelection(option: BackgroundItem, color?: string) {
    selectedId.value = option.id;
    if (color) {
      sampledColor.value = color;
    }
  }

  function setSampledColor(color?: string) {
    if (color) {
      sampledColor.value = color;
    }
  }

  function applyPickerSelection(payload: { option: BackgroundItem; color?: string }) {
    setSelection(payload.option, payload.color ?? payload.option.accent);
  }

  function addCustomBackground(file: File): Promise<BackgroundItem> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        const customBg: BackgroundItem = {
          id: `custom-${Date.now()}`,
          label: file.name.replace(/\.[^/.]+$/, ""),
          kind: BackgroundKind.Image,
          src: dataUrl,
          accent: "#00b4ff",
          blur: false,
        };
        customBackgrounds.value.push(customBg);
        resolve(customBg);
      };
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsDataURL(file);
    });
  }

  function removeCustomBackground(id: string) {
    const index = customBackgrounds.value.findIndex((bg) => bg.id === id);
    if (index !== -1) {
      customBackgrounds.value.splice(index, 1);
      // If the removed background was selected, switch to default
      if (selectedId.value === id) {
        selectedId.value = presets[0].id;
      }
    }
  }

  return {
    options,
    selectedId,
    selectedOption,
    sampledColor,
    customBackgrounds,
    setSelection,
    setSampledColor,
    applyPickerSelection,
    addCustomBackground,
    removeCustomBackground,
  };
});
