const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const SIZE = 1024;
const cx = SIZE / 2;
const cy = SIZE / 2;

// VortexLogo geometry (matches React Native component at size = SIZE)
const s     = SIZE;
const rx    = s * 0.45;       // ellipse half-width  (rW/2 = s*0.9/2)
const ry    = s * 0.15;       // ellipse half-height (rH/2 = s*0.3/2)
const sw    = Math.max(6, s * 0.026); // stroke-width
const coreR = s * 0.37;       // dark core radius
const dotR  = s * 0.05;       // center dot radius
const dotCY = s * 0.555;      // center dot y

const glowBlur = 28;

const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}"
     xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- Outer logo glow (cyan) -->
    <filter id="outerGlow" x="-60%" y="-60%" width="220%" height="220%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="${glowBlur}" result="blur"/>
      <feColorMatrix in="blur" type="matrix"
        values="0 0 0 0 0   0 0 0 0 0.898   0 0 0 0 1   0 0 0 0.9 0"
        result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>

    <!-- V text glow -->
    <filter id="vGlow" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="${s * 0.025}" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>

    <!-- Dot glow -->
    <filter id="dotGlow" x="-200%" y="-200%" width="500%" height="500%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="12" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>

    <!-- Clip to circle -->
    <clipPath id="circle">
      <circle cx="${cx}" cy="${cy}" r="${cx - 1}"/>
    </clipPath>
  </defs>

  <!-- Dark background (full square — OS clips to rounded square for icon) -->
  <rect width="${SIZE}" height="${SIZE}" fill="#01010D"/>

  <!-- Nebula glow behind logo -->
  <radialGradient id="nebulaGrad" cx="50%" cy="50%" r="50%">
    <stop offset="0%"   stop-color="#00E5FF" stop-opacity="0.18"/>
    <stop offset="60%"  stop-color="#7C3AED" stop-opacity="0.10"/>
    <stop offset="100%" stop-color="#01010D" stop-opacity="0"/>
  </radialGradient>
  <circle cx="${cx}" cy="${cy}" r="${cx}" fill="url(#nebulaGrad)"/>

  <!-- Wrapper group with outer glow, clipped to circle -->
  <g filter="url(#outerGlow)" clip-path="url(#circle)">

    <!-- Dark core -->
    <circle cx="${cx}" cy="${cy}" r="${coreR}" fill="#02021A"/>

    <!-- Orbital ellipses -->
    <!-- Cyan — 0° -->
    <ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}"
      fill="none" stroke="#00E5FF" stroke-width="${sw}" opacity="0.9"
      transform="rotate(0,${cx},${cy})"/>

    <!-- Purple — 60° -->
    <ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}"
      fill="none" stroke="#9B5DE5" stroke-width="${sw}" opacity="0.85"
      transform="rotate(60,${cx},${cy})"/>

    <!-- Blue — -60° -->
    <ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}"
      fill="none" stroke="#0A84FF" stroke-width="${sw}" opacity="0.85"
      transform="rotate(-60,${cx},${cy})"/>

  </g>

  <!-- V text (on top of rings, with glow) -->
  <text
    x="${cx}" y="${s * 0.63}"
    font-family="Arial Black, Impact, Arial, sans-serif"
    font-size="${s * 0.44}"
    font-weight="900"
    fill="#00E5FF"
    text-anchor="middle"
    letter-spacing="-10"
    filter="url(#vGlow)"
  >V</text>

  <!-- Center white dot -->
  <circle cx="${cx}" cy="${dotCY}" r="${dotR}"
    fill="#FFFFFF" filter="url(#dotGlow)"/>

  <!-- Outer ring -->
  <circle cx="${cx}" cy="${cy}" r="${cx - 2}"
    fill="none" stroke="#00E5FF" stroke-width="2" opacity="0.28"/>
</svg>`;

const svgPath = path.join(__dirname, "icon-vortex.svg");
const pngPath = path.join(
  __dirname,
  "..",
  "artifacts",
  "mobile",
  "assets",
  "images",
  "icon.png"
);

fs.writeFileSync(svgPath, svg, "utf8");
console.log("SVG written to", svgPath);

// Use ImageMagick convert: -background none keeps transparency, -flatten merges with dark bg
const cmd = `convert -background "#01010D" -density 300 "${svgPath}" -resize ${SIZE}x${SIZE} "${pngPath}"`;
console.log("Running:", cmd);
execSync(cmd, { stdio: "inherit" });

console.log("Icon written to", pngPath);
