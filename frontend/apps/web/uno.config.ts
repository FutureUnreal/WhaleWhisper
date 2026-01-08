import { createExternalPackageIconLoader } from "@iconify/utils/lib/loader/external-pkg";
import { defineConfig, presetAttributify, presetIcons, presetUno, presetWebFonts, transformerDirectives, transformerVariantGroup } from "unocss";
import { colors } from "@unocss/preset-mini";

import {
  chatProviderOptions,
  speechProviderOptions,
  transcriptionProviderOptions,
} from "@whalewhisper/app-core/data/provider-options";

const primary = {
  50: "#f1f7ff",
  100: "#e1eeff",
  200: "#bfdcff",
  300: "#92c3ff",
  400: "#61a3ff",
  500: "#3a88ff",
  600: "#256cf5",
  700: "#1c56d8",
  800: "#1c47ad",
  900: "#1c3b88",
  950: "#142455",
};

const iconSafelist = [
  ...chatProviderOptions,
  ...speechProviderOptions,
  ...transcriptionProviderOptions,
].map((option) => option.icon);

export default defineConfig({
  presets: [
    presetUno(),
    presetAttributify(),
    presetIcons({
      scale: 1.2,
      collections: {
        ...createExternalPackageIconLoader("@proj-airi/lobe-icons"),
        solar: () => import("@iconify-json/solar/icons.json").then((m) => m.default),
        "eos-icons": () => import("@iconify-json/eos-icons/icons.json").then((m) => m.default),
        "simple-icons": () => import("@iconify-json/simple-icons/icons.json").then((m) => m.default),
      },
    }),
    presetWebFonts({
      provider: "google",
      fonts: {
        sans: "DM Sans:400,500,600,700",
        mono: "DM Mono:400,500",
      },
    }),
  ],
  safelist: iconSafelist,
  transformers: [transformerDirectives(), transformerVariantGroup()],
  theme: {
    colors: {
      primary,
      neutral: colors.neutral,
    },
    fontFamily: {
      sans: "\"DM Sans\", \"Segoe UI\", system-ui, sans-serif",
      mono: "\"DM Mono\", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, \"Liberation Mono\", \"Courier New\", monospace",
    },
  },
});
