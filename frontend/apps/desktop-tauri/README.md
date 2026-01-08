# WhaleWhisper Desktop (Tauri)

This app reuses the Web frontend build output.

## Dev

1. Start the web dev server (this is run automatically by Tauri):
   - `pnpm -C ../web dev`
2. Run Tauri:
   - `pnpm dev`

If your dev server uses a different port, update `devUrl` in `src-tauri/tauri.conf.json`.

## Build

1. Build Tauri bundle (runs backend + renderer build hook):
   - `pnpm build`

Notes:
- `pnpm build` triggers `scripts/prepare-backend.ps1` via `beforeBuildCommand`.
- The backend sidecar is built via PyInstaller from `backend/scripts/run_backend.py`.
- The Tauri config points to `../renderer/dist`.
- Backend defaults to `127.0.0.1:8090`. Override with `WHALEWHISPER_BACKEND_HOST`, `WHALEWHISPER_BACKEND_PORT`, `WHALEWHISPER_BACKEND_DATA_DIR`.
