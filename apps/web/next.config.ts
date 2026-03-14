import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Server-side rendering mode — required for the CLI-launched web app.
  // (The previous `output: 'export'` was for Tauri's static bundle and is
  //  not compatible with `next start` or server-side features.)
};

export default nextConfig;
