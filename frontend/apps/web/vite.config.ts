import path from "node:path";
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import UnoCSS from "unocss/vite";

export default defineConfig({
  plugins: [vue(), UnoCSS()],
  resolve: {
    alias: {
      "@whalewhisper/app-core": path.resolve(
        __dirname,
        "../../packages/app-core/src"
      ),
      "@whalewhisper/app-settings": path.resolve(
        __dirname,
        "../../packages/app-settings/src"
      ),
      "@whalewhisper/stage-core": path.resolve(
        __dirname,
        "../../packages/stage-core/src"
      ),
      "@whalewhisper/stage-settings-ui": path.resolve(
        __dirname,
        "../../packages/stage-settings-ui/src"
      ),
    },
  },
  server: {
    port: 5174,
    fs: {
      allow: [__dirname, path.resolve(__dirname, "../../packages")],
    },
  },
});
