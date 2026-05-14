// vite.config.ts — Vite build and dev server configuration for the website.
//
// Key responsibilities:
//   - Validates required environment variables (PORT, BASE_PATH) at startup
//   - Configures the dev server port and host
//   - Sets the base URL for asset paths (important for sub-path or root hosting)
//   - Wires up plugins: React, Tailwind CSS
//   - Sets up the @/ import alias pointing to src/
//   - Outputs the production build to dist/public/
//
// Environment variables (set in artifact.toml [services.env]):
//   PORT      — port the dev server listens on (currently 8082)
//   BASE_PATH — URL prefix for all assets, e.g. "/" for root hosting
//
// To change where the site is hosted (sub-path vs root), update BASE_PATH in artifact.toml.

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
// @vitejs/plugin-react — enables JSX transform and React Fast Refresh in dev.

import tailwindcss from "@tailwindcss/vite";
// @tailwindcss/vite — integrates Tailwind CSS v4 directly into the Vite pipeline.

import path from "path";

// ── PORT validation ──────────────────────────────────────────────────────────
// PORT must be set by the environment before starting the dev server.
// Throws at config-load time so misconfiguration is caught immediately.
const rawPort = process.env.PORT;

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

// ── BASE_PATH validation ─────────────────────────────────────────────────────
// BASE_PATH controls the Vite `base` option — the URL prefix for all built assets.
// Must match the path the site is served at (e.g. "/" for root, "/website/" for sub-path).
const basePath = process.env.BASE_PATH;

if (!basePath) {
  throw new Error(
    "BASE_PATH environment variable is required but was not provided.",
  );
}

export default defineConfig({
  // base: sets the public base URL. All asset imports and hrefs are prefixed with this.
  base: basePath,

  plugins: [
    react(),       // JSX + Fast Refresh
    tailwindcss(), // Tailwind CSS v4
  ],

  resolve: {
    alias: {
      // @/ — shorthand alias for the src/ directory.
      // e.g. import { Navbar } from '@/components/Navbar'
      "@": path.resolve(import.meta.dirname, "src"),
    },
    // dedupe: prevents duplicate React instances when multiple packages
    // bundle their own copy of React.
    dedupe: ["react", "react-dom"],
  },

  // root: where Vite looks for index.html (this artifact's directory).
  root: path.resolve(import.meta.dirname),

  build: {
    // outDir: where the production build is written.
    // Must match the publicDir set in the hosting/deployment config.
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true, // clean the output folder before each build
  },

  server: {
    port,
    host: "0.0.0.0",   // listen on all interfaces (required for proxied preview)
    allowedHosts: true, // allow requests from any host/domain
    fs: {
      strict: true,
      deny: ["**/.*"], // block access to hidden/dot files for security
    },
  },

  preview: {
    // preview server (used by `vite preview`) mirrors the dev server settings.
    port,
    host: "0.0.0.0",
    allowedHosts: true,
  },
});
