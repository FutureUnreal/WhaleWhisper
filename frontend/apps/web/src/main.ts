import { autoAnimatePlugin } from "@formkit/auto-animate/vue";
import { createPinia } from "pinia";
import { createApp } from "vue";
import App from "./App.vue";

import "@unocss/reset/tailwind.css";
import "./styles.css";
import "uno.css";

const pinia = createPinia();

createApp(App).use(autoAnimatePlugin).use(pinia).mount("#app");
