# Frontend

Structure:
- apps/web: Vue + Vite (web client)
- apps/desktop: Electron shell that loads the web client
- apps/web/src/components/scenes/WidgetStage.vue: Stage wrapper aligned with AIRI layout
- apps/web/src/components/Live2DStage.vue: Live2D canvas (pixi-live2d-display)
- apps/web/src/components/layouts/*: Header + InteractiveArea + MobileInteractiveArea
- apps/web/src/components/widgets/*: Chat container/history/input/actions
- apps/web/src/components/backgrounds/*: Background provider + picker
- apps/web/src/stores/*: Pinia stores (chat/background/live2d)
- apps/web/src/services/ws.ts: WebSocket client helpers
- apps/web/src/config.json: Default web client configuration

## Notes
- Place Live2D models under apps/web/public/live2d.
- Live2D uses pixi.js + pixi-live2d-display, exposed via window.PIXI.
- Cubism core runtime should live at apps/web/public/live2d/live2dcubismcore.min.js.
- WebSocket URL can be overridden via VITE_WS_URL.
- API base URL for health checks can be overridden via VITE_API_BASE_URL.
- User/profile overrides: VITE_USER_ID, VITE_PROFILE_ID.
- Edit apps/web/src/config.json to change defaults.
- Layout mirrors AIRI: background provider + header + stage + interactive area.
- Mobile uses a fixed bottom chat overlay with action buttons.
- Background selection persists via Pinia + localStorage.
