// VortexLogo.tsx — The animated VORTREXYN brand logo icon.
// Renders as an SVG with:
//   - A circular background filled with a radial gradient (cyan → purple)
//   - A bold white "V" letter centered in the circle
//   - Three elliptical orbital rings that rotate continuously using framer-motion:
//       Ring 1 (cyan):   rotates clockwise at 10s per revolution
//       Ring 2 (purple): rotates counter-clockwise at 15s per revolution
//       Ring 3 (blue):   rotates clockwise at 20s per revolution
//
// Usage: <VortexLogo className="w-8 h-8" />
// The className prop controls the rendered size. Default is w-12 h-12.
//
// Brand colors used:
//   #00E5FF — cyan (primary)
//   #9B5DE5 — purple (secondary)
//   #0A84FF — blue (accent)

import React from "react";
import { motion } from "framer-motion";
// motion.g — framer-motion wrapper for SVG <g> groups, enabling rotation animations.

export function VortexLogo({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={`w-12 h-12 ${className}`} xmlns="http://www.w3.org/2000/svg">
      <defs>
        {/* Radial gradient: cyan at center fading to purple at edges */}
        <radialGradient id="vortex-grad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#00E5FF" />
          <stop offset="100%" stopColor="#9B5DE5" />
        </radialGradient>
      </defs>

      {/* Background circle filled with the cyan→purple gradient */}
      <circle cx="50" cy="50" r="30" fill="url(#vortex-grad)" />

      {/* "V" letter centered in the circle */}
      <text x="50" y="62" fontSize="36" fontWeight="bold" fill="white" textAnchor="middle" fontFamily="sans-serif">
        V
      </text>

      {/* Ring 1 — cyan, rotates clockwise every 10 seconds */}
      <motion.g
        animate={{ rotate: 360 }}
        transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
        style={{ transformOrigin: "50px 50px" }} // rotate around the SVG center
      >
        <ellipse cx="50" cy="50" rx="45" ry="15" fill="none" stroke="#00E5FF" strokeWidth="2" transform="rotate(30 50 50)" />
      </motion.g>

      {/* Ring 2 — purple, rotates counter-clockwise every 15 seconds */}
      <motion.g
        animate={{ rotate: -360 }}
        transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
        style={{ transformOrigin: "50px 50px" }}
      >
        <ellipse cx="50" cy="50" rx="42" ry="12" fill="none" stroke="#9B5DE5" strokeWidth="2" transform="rotate(-45 50 50)" />
      </motion.g>

      {/* Ring 3 — blue, rotates clockwise every 20 seconds */}
      <motion.g
        animate={{ rotate: 360 }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        style={{ transformOrigin: "50px 50px" }}
      >
        <ellipse cx="50" cy="50" rx="38" ry="18" fill="none" stroke="#0A84FF" strokeWidth="2" transform="rotate(75 50 50)" />
      </motion.g>
    </svg>
  );
}
