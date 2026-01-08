import { colors } from "@unocss/preset-mini";
import { defineConfig, presetAttributify, presetIcons, presetUno } from "unocss";

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

export default defineConfig({
  presets: [
    presetUno(),
    presetAttributify(),
    presetIcons({
      scale: 1.2,
      collections: {
        solar: () => import("@iconify-json/solar/icons.json").then((m) => m.default),
      },
    }),
  ],
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
