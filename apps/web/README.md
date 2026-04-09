# Vigilante Desktop Renderer

This package is the internal renderer for the Vigilante desktop app.

- `pnpm dev` inside this package starts the Next renderer only.
- `pnpm tauri:dev` launches the full desktop app.
- `pnpm tauri:build` builds the native desktop bundle.

This renderer is not a standalone web product. Browser access is unsupported outside the Tauri shell.
