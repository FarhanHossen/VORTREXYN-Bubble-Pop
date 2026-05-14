// vite.config.ts — Vite build and dev server configuration for the website.
//
// Key responsibilities:
//   - Configures the dev server port and host
//   - Sets the base URL for asset paths (important for sub-path or root hosting)
//   - Wires up plugins: React, Tailwind CSS
//   - Sets up the @/ import alias pointing to src/
//   - Outputs the production build to dist/public/
//
// Environment variables (set in artifact.toml [services.env]):
//   PORT      — port the dev server listens on (only required for local dev)
//   BASE_PATH — URL prefix for all assets, e.g. "/" for root hosting

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

// PORT is only used by the dev/preview server — not needed during a static build.
const port = Number(process.env.PORT ?? "5173");

// BASE_PATH controls the Vite `base` option.
// Defaults to "/" which is correct for Netlify root hosting.
const basePath = process.env.BASE_PATH ?? "/";

export default defineConfig({
  base: basePath,

  plugins: [
    react(),
    tailwindcss(),
  ],

  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
    },
    dedupe: ["react", "react-dom"],
  },

  root: path.resolve(import.meta.dirname),

  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },

  server: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },

  preview: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
  },
});
