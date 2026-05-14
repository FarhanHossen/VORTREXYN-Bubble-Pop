/**
 * build.js
 *
 * Production build script for the VORTREXYN Bubble Pop mobile app.
 *
 * What it does:
 *   1. Starts a Metro bundler process (Expo's JavaScript bundler)
 *   2. Downloads the compiled JS bundle for both iOS and Android
 *   3. Downloads the Expo manifest (metadata about the bundle)
 *   4. Copies all referenced static assets (images, fonts, etc.)
 *   5. Rewrites bundle URLs to point at the production domain
 *   6. Writes the final manifests to static-build/ios/ and static-build/android/
 *
 * Output layout:
 *   static-build/
 *     {timestamp}/
 *       _expo/static/js/
 *         ios/bundle.js
 *         android/bundle.js
 *         {asset folders...}
 *     ios/manifest.json
 *     android/manifest.json
 *
 * Run via: pnpm --filter @workspace/mobile run build
 */

const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const { Readable } = require("stream");
const { pipeline } = require("stream/promises");

/** Reference to the Metro child process — used to kill it on exit/error. */
let metroProcess = null;

/** Absolute path to the mobile app package root (one level up from this script). */
const projectRoot = path.resolve(__dirname, "..");

/**
 * Walks up the directory tree looking for a pnpm-workspace.yaml file.
 * Returns the directory containing it (the monorepo root).
 */
function findWorkspaceRoot(startDir) {
  let dir = startDir;
  while (dir !== path.dirname(dir)) {
    if (fs.existsSync(path.join(dir, "pnpm-workspace.yaml"))) {
      return dir;
    }
    dir = path.dirname(dir);
  }
  throw new Error("Could not find workspace root (no pnpm-workspace.yaml found)");
}

const workspaceRoot = findWorkspaceRoot(projectRoot);

/** BASE_PATH is the URL path prefix where the app is served (default: "/"). */
const basePath = (process.env.BASE_PATH || "/").replace(/\/+$/, "");

/** Logs an error, kills Metro if running, then exits with code 1. */
function exitWithError(message) {
  console.error(message);
  if (metroProcess) {
    metroProcess.kill();
  }
  process.exit(1);
}

/**
 * Registers handlers for SIGINT / SIGTERM / SIGHUP so Metro is always
 * cleaned up even if the build is cancelled mid-way.
 */
function setupSignalHandlers() {
  const cleanup = () => {
    if (metroProcess) {
      console.log("Cleaning up Metro process...");
      metroProcess.kill();
    }
    process.exit(0);
  };

  process.on("SIGINT", cleanup);
  process.on("SIGTERM", cleanup);
  process.on("SIGHUP", cleanup);
}

/**
 * Strips the protocol prefix from a URL and returns just the host portion.
 * e.g. "https://example.com/path" → "example.com"
 */
function stripProtocol(domain) {
  let urlString = domain.trim();

  if (!/^https?:\/\//i.test(urlString)) {
    urlString = `https://${urlString}`;
  }

  return new URL(urlString).host;
}

/**
 * Resolves the deployment domain from environment variables.
 * Checks three env vars in priority order and returns the first one found.
 * Exits if none are set.
 */
function getDeploymentDomain() {
  if (process.env.INTERNAL_APP_DOMAIN) {
    return stripProtocol(process.env.INTERNAL_APP_DOMAIN);
  }

  if (process.env.APP_DEV_DOMAIN) {
    return stripProtocol(process.env.APP_DEV_DOMAIN);
  }

  if (process.env.EXPO_PUBLIC_DOMAIN) {
    return stripProtocol(process.env.EXPO_PUBLIC_DOMAIN);
  }

  console.error(
    "ERROR: No deployment domain found. Set EXPO_PUBLIC_DOMAIN to your production domain.",
  );
  process.exit(1);
}

/**
 * Returns the unique app instance ID from the environment.
 * Used by Metro to differentiate between multiple running instances.
 */
function getAppId() {
  return process.env.APP_ID || process.env.EXPO_PUBLIC_APP_ID;
}

/**
 * Creates the required output directories for the build artifacts.
 * Deletes any existing static-build/ folder first to ensure a clean build.
 *
 * @param timestamp - Unique build ID (used as a sub-folder name)
 */
function prepareDirectories(timestamp) {
  console.log("Preparing build directories...");

  const staticBuild = path.join(projectRoot, "static-build");
  if (fs.existsSync(staticBuild)) {
    fs.rmSync(staticBuild, { recursive: true });
  }

  const dirs = [
    path.join(staticBuild, timestamp, "_expo", "static", "js", "ios"),
    path.join(staticBuild, timestamp, "_expo", "static", "js", "android"),
    path.join(staticBuild, "ios"),
    path.join(staticBuild, "android"),
  ];

  for (const dir of dirs) {
    fs.mkdirSync(dir, { recursive: true });
  }

  console.log("Build:", timestamp);
}

/**
 * Clears Metro's transform cache to force a fresh compilation.
 * Prevents stale cache from being used in production bundles.
 */
function clearMetroCache() {
  console.log("Clearing Metro cache...");

  const cacheDirs = [
    path.join(projectRoot, ".metro-cache"),
    path.join(projectRoot, "node_modules/.cache/metro"),
  ];

  for (const dir of cacheDirs) {
    if (fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }

  console.log("Cache cleared");
}

/**
 * Checks if Metro is already running and healthy by hitting its /status endpoint.
 * Returns true if Metro responds OK, false otherwise.
 */
async function checkMetroHealth() {
  try {
    const response = await fetch("http://localhost:8081/status", {
      signal: AbortSignal.timeout(5000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Spawns a Metro bundler process and waits up to 60 seconds for it to become healthy.
 * Sets EXPO_PUBLIC_DOMAIN so the bundle knows its production URL.
 *
 * @param expoPublicDomain - The production host to embed in the bundle
 * @param appId            - Unique app instance ID passed to Metro
 */
async function startMetro(expoPublicDomain, appId) {
  const isRunning = await checkMetroHealth();
  if (isRunning) {
    console.log("Metro already running");
    return;
  }

  console.log("Starting Metro...");
  console.log(`Setting EXPO_PUBLIC_DOMAIN=${expoPublicDomain}`);
  const env = {
    ...process.env,
    EXPO_PUBLIC_DOMAIN: expoPublicDomain,
    EXPO_PUBLIC_APP_ID: appId,
  };

  if (appId) {
    console.log(`Setting EXPO_PUBLIC_APP_ID=${appId}`);
  }

  metroProcess = spawn(
    "pnpm",
    [
      "exec",
      "expo",
      "start",
      "--no-dev",
      "--minify",
      "--localhost",
    ],
    {
      stdio: ["ignore", "pipe", "pipe"],
      detached: false,
      cwd: projectRoot,
      env,
    },
  );

  if (metroProcess.stdout) {
    metroProcess.stdout.on("data", (data) => {
      const output = data.toString().trim();
      if (output) console.log(`[Metro] ${output}`);
    });
  }
  if (metroProcess.stderr) {
    metroProcess.stderr.on("data", (data) => {
      const output = data.toString().trim();
      if (output) console.error(`[Metro Error] ${output}`);
    });
  }

  // Poll Metro every second for up to 60 seconds
  for (let i = 0; i < 60; i++) {
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const healthy = await checkMetroHealth();
    if (healthy) {
      console.log("Metro ready");
      return;
    }
  }

  console.error("Metro timeout");
  process.exit(1);
}

/**
 * Downloads a file from a URL with a 5-minute timeout and streams it to disk.
 * Throws if the response is not OK or the downloaded file is empty.
 *
 * @param url        - Source URL to download
 * @param outputPath - Local file path to write to
 */
async function downloadFile(url, outputPath) {
  const controller = new AbortController();
  const fiveMinMS = 5 * 60 * 1_000;
  const timeoutId = setTimeout(() => controller.abort(), fiveMinMS);

  try {
    console.log(`Downloading: ${url}`);
    const response = await fetch(url, { signal: controller.signal });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const file = fs.createWriteStream(outputPath);
    await pipeline(Readable.fromWeb(response.body), file);

    const fileSize = fs.statSync(outputPath).size;

    if (fileSize === 0) {
      fs.unlinkSync(outputPath);
      throw new Error("Downloaded file is empty");
    }
  } catch (error) {
    if (fs.existsSync(outputPath)) {
      fs.unlinkSync(outputPath);
    }

    if (error.name === "AbortError") {
      throw new Error(`Download timeout after 5m: ${url}`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Downloads the compiled JS bundle for the given platform from Metro.
 * The bundle is the entire app compiled into a single minified file.
 *
 * @param platform  - "ios" or "android"
 * @param timestamp - Build ID used to determine the output path
 */
async function downloadBundle(platform, timestamp) {
  const entryPath = path.resolve(projectRoot, "node_modules", "expo-router", "entry");
  const bundlePath = path.relative(workspaceRoot, entryPath);
  const url = new URL(`http://localhost:8081/${bundlePath}.bundle`);
  url.searchParams.set("platform", platform);
  url.searchParams.set("dev", "false");
  url.searchParams.set("hot", "false");
  url.searchParams.set("lazy", "false");
  url.searchParams.set("minify", "true");

  const output = path.join(
    "static-build",
    timestamp,
    "_expo",
    "static",
    "js",
    platform,
    "bundle.js",
  );

  console.log(`Fetching ${platform} bundle...`);
  await downloadFile(url.toString(), output);
  console.log(`${platform} bundle ready`);
}

/**
 * Downloads the Expo manifest for the given platform.
 * The manifest describes the bundle URL, assets, and client configuration.
 *
 * @param platform - "ios" or "android"
 * @returns Parsed manifest JSON object
 */
async function downloadManifest(platform) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 300_000);

  try {
    console.log(`Fetching ${platform} manifest...`);
    const response = await fetch("http://localhost:8081/manifest", {
      headers: { "expo-platform": platform },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const manifest = await response.json();
    console.log(`${platform} manifest ready`);
    return manifest;
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error(
        `Manifest download timeout after 5m for platform: ${platform}`,
      );
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Downloads iOS and Android bundles sequentially (Metro struggles with both in parallel),
 * then fetches both manifests in parallel.
 *
 * @param timestamp - Build ID
 * @returns Object containing parsed manifests for ios and android
 */
async function downloadBundlesAndManifests(timestamp) {
  console.log("Downloading bundles and manifests...");
  console.log("This may take several minutes for production builds...");

  try {
    // Bundles are sequential — Metro can't handle both platforms simultaneously
    // without stalling. Manifests are cheap and run in parallel after.
    await downloadBundle("ios", timestamp);
    await downloadBundle("android", timestamp);

    const [iosManifest, androidManifest] = await Promise.all([
      downloadManifest("ios"),
      downloadManifest("android"),
    ]);

    console.log("All downloads completed successfully");
    return { ios: iosManifest, android: androidManifest };
  } catch (error) {
    exitWithError(`Download failed: ${error.message}`);
  }
}

/**
 * Scans both platform bundles for embedded asset metadata and returns
 * a deduplicated list of all assets referenced across both bundles.
 *
 * Each asset entry includes its URL path, hash, filename, and which platforms need it.
 *
 * @param timestamp - Build ID
 * @returns Array of unique asset descriptors
 */
function extractAssets(timestamp) {
  const staticBuild = path.join(projectRoot, "static-build");
  const bundles = {
    ios: fs.readFileSync(
      path.join(staticBuild, timestamp, "_expo", "static", "js", "ios", "bundle.js"),
      "utf-8",
    ),
    android: fs.readFileSync(
      path.join(staticBuild, timestamp, "_expo", "static", "js", "android", "bundle.js"),
      "utf-8",
    ),
  };

  const assetsMap = new Map();
  // Regex pattern that matches Metro's embedded asset metadata objects
  const assetPattern =
    /httpServerLocation:"([^"]+)"[^}]*hash:"([^"]+)"[^}]*name:"([^"]+)"[^}]*type:"([^"]+)"/g;

  const extractFromBundle = (bundle, platform) => {
    for (const match of bundle.matchAll(assetPattern)) {
      const originalPath = match[1];
      const filename = match[3] + "." + match[4];

      const tempUrl = new URL(`http://localhost:8081${originalPath}`);
      const unstablePath = tempUrl.searchParams.get("unstable_path");

      if (!unstablePath) {
        throw new Error(`Asset missing unstable_path: ${originalPath}`);
      }

      const decodedPath = decodeURIComponent(unstablePath);
      const key = path.posix.join(decodedPath, filename);

      if (!assetsMap.has(key)) {
        const asset = {
          url: path.posix.join("/", decodedPath, filename),
          originalPath: originalPath,
          filename: filename,
          relativePath: decodedPath,
          hash: match[2],
          platforms: new Set(),
        };

        assetsMap.set(key, asset);
      }
      assetsMap.get(key).platforms.add(platform);
    }
  };

  extractFromBundle(bundles.ios, "ios");
  extractFromBundle(bundles.android, "android");

  return Array.from(assetsMap.values());
}

/**
 * Copies all discovered assets from the local project files into the static-build folder.
 * Falls back from the project root to the monorepo root when searching for files.
 *
 * @param assets    - List of asset descriptors from extractAssets()
 * @param timestamp - Build ID
 * @returns Number of assets successfully copied
 */
async function downloadAssets(assets, timestamp) {
  if (assets.length === 0) {
    return 0;
  }

  console.log("Copying assets...");
  let successCount = 0;
  const failures = [];

  const downloadPromises = assets.map(async (asset) => {
    const tempUrl = new URL(`http://localhost:8081${asset.originalPath}`);
    const unstablePath = tempUrl.searchParams.get("unstable_path");

    if (!unstablePath) {
      throw new Error(`Asset missing unstable_path: ${asset.originalPath}`);
    }

    const decodedPath = decodeURIComponent(unstablePath);

    const outputDir = path.join(
      projectRoot,
      "static-build",
      timestamp,
      "_expo",
      "static",
      "js",
      asset.relativePath,
    );
    fs.mkdirSync(outputDir, { recursive: true });
    const output = path.join(outputDir, asset.filename);

    try {
      // Look in project root first, then monorepo root as fallback
      const candidates = [
        path.join(projectRoot, decodedPath, asset.filename),
        path.join(workspaceRoot, decodedPath, asset.filename),
      ];
      const found = candidates.find((p) => fs.existsSync(p));
      if (!found) {
        throw new Error(`Asset not found on disk: ${asset.filename}`);
      }
      fs.copyFileSync(found, output);
      successCount++;
    } catch (error) {
      failures.push({
        filename: asset.filename,
        error: error.message,
        url: asset.originalPath,
      });
    }
  });

  await Promise.all(downloadPromises);

  if (failures.length > 0) {
    const errorMsg =
      `Failed to download ${failures.length} asset(s):\n` +
      failures
        .map((f) => `  - ${f.filename}: ${f.error} (${f.url})`)
        .join("\n");
    exitWithError(errorMsg);
  }

  console.log(`Copied ${successCount} assets`);
  return successCount;
}

/**
 * Rewrites all `httpServerLocation` references in the compiled bundles from
 * localhost Metro URLs to the final production CDN/host URLs.
 *
 * @param timestamp - Build ID
 * @param baseUrl   - Production base URL (e.g. "https://vortrexyn.app")
 */
function updateBundleUrls(timestamp, baseUrl) {
  const updateForPlatform = (platform) => {
    const bundlePath = path.join(
      projectRoot,
      "static-build",
      timestamp,
      "_expo",
      "static",
      "js",
      platform,
      "bundle.js",
    );
    let bundle = fs.readFileSync(bundlePath, "utf-8");

    bundle = bundle.replace(
      /httpServerLocation:"(\/[^"]+)"/g,
      (_match, capturedPath) => {
        const tempUrl = new URL(`http://localhost:8081${capturedPath}`);
        const unstablePath = tempUrl.searchParams.get("unstable_path");

        if (!unstablePath) {
          throw new Error(
            `Asset missing unstable_path in bundle: ${capturedPath}`,
          );
        }

        const decodedPath = decodeURIComponent(unstablePath);
        return `httpServerLocation:"${baseUrl}${basePath}/${timestamp}/_expo/static/js/${decodedPath}"`;
      },
    );

    fs.writeFileSync(bundlePath, bundle);
  };

  updateForPlatform("ios");
  updateForPlatform("android");
  console.log("Updated bundle URLs");
}

/**
 * Updates both manifests with production URLs for the bundle and all assets,
 * then writes them to static-build/{platform}/manifest.json.
 *
 * @param manifests   - Object with ios and android manifest objects
 * @param timestamp   - Build ID
 * @param baseUrl     - Production base URL
 * @param assetsByHash - Map from asset hash → {relativePath, filename}
 */
function updateManifests(manifests, timestamp, baseUrl, assetsByHash) {
  const updateForPlatform = (platform, manifest) => {
    if (!manifest.launchAsset || !manifest.extra) {
      exitWithError(`Malformed manifest for ${platform}`);
    }

    // Point the launch asset (the JS bundle) at its production URL
    manifest.launchAsset.url = `${baseUrl}${basePath}/${timestamp}/_expo/static/js/${platform}/bundle.js`;
    manifest.launchAsset.key = `bundle-${timestamp}`;
    manifest.createdAt = new Date(
      Number(timestamp.split("-")[0]),
    ).toISOString();
    manifest.extra.expoClient.hostUri =
      baseUrl.replace("https://", "") + "/" + platform;
    manifest.extra.expoGo.debuggerHost =
      baseUrl.replace("https://", "") + "/" + platform;
    manifest.extra.expoGo.packagerOpts.dev = false;

    // Rewrite each asset URL from localhost to the production CDN path
    if (manifest.assets && manifest.assets.length > 0) {
      manifest.assets.forEach((asset) => {
        if (!asset.url) return;

        const hash = asset.hash;
        if (!hash) return;

        const assetInfo = assetsByHash.get(hash);
        if (!assetInfo) return;

        asset.url = `${baseUrl}${basePath}/${timestamp}/_expo/static/js/${assetInfo.relativePath}/${assetInfo.filename}`;
      });
    }

    fs.writeFileSync(
      path.join(projectRoot, "static-build", platform, "manifest.json"),
      JSON.stringify(manifest, null, 2),
    );
  };

  updateForPlatform("ios", manifests.ios);
  updateForPlatform("android", manifests.android);
  console.log("Manifests updated");
}

/** Main entry point — orchestrates the entire build pipeline. */
async function main() {
  console.log("Building static Expo Go deployment...");

  setupSignalHandlers();

  const domain = getDeploymentDomain();
  const appId   = getAppId();
  const baseUrl  = `https://${domain}`;

  // Timestamp doubles as a unique build ID (milliseconds + process ID)
  const timestamp = `${Date.now()}-${process.pid}`;

  prepareDirectories(timestamp);
  clearMetroCache();

  await startMetro(domain, appId);

  // Allow up to 10 minutes for large bundles before giving up
  const downloadTimeout = 600000;
  const downloadPromise = downloadBundlesAndManifests(timestamp);
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => {
      reject(
        new Error(
          `Overall download timeout after ${downloadTimeout / 1000} seconds. ` +
            "Metro may be struggling to generate bundles. Check Metro logs above.",
        ),
      );
    }, downloadTimeout);
  });

  const manifests = await Promise.race([downloadPromise, timeoutPromise]);

  console.log("Processing assets...");
  const assets = extractAssets(timestamp);
  console.log("Found", assets.length, "unique asset(s)");

  // Build a hash → assetInfo map for quick lookups during manifest URL rewriting
  const assetsByHash = new Map();
  for (const asset of assets) {
    assetsByHash.set(asset.hash, {
      relativePath: asset.relativePath,
      filename: asset.filename,
    });
  }

  const assetCount = await downloadAssets(assets, timestamp);

  if (assetCount > 0) {
    updateBundleUrls(timestamp, baseUrl);
  }

  console.log("Updating manifests and creating landing page...");
  updateManifests(manifests, timestamp, baseUrl, assetsByHash);

  console.log("Build complete! Deploy to:", baseUrl);

  if (metroProcess) {
    metroProcess.kill();
  }
  process.exit(0);
}

main().catch((error) => {
  console.error("Build failed:", error.message);
  if (metroProcess) {
    metroProcess.kill();
  }
  process.exit(1);
});
