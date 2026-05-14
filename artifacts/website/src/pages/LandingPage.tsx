// LandingPage.tsx — Main marketing page shown at the root URL (/).
// Sections in order:
//   1. Hero       — animated logo with orbital rings, game title, CTA buttons
//   2. Features   — 2×3 grid of feature cards (emoji + title + description)
//   3. Final CTA  — bottom "Ready to Pop?" call-to-action with App Store link
//
// To update the App Store link, change APP_STORE_URL.
// To add/edit feature cards, update the `features` array.

import React from 'react';
import { motion } from 'framer-motion';
// framer-motion — handles all enter/scroll animations (fade, slide, scale).
// Each motion.div/h1/p uses `initial` (start state) and `animate`/`whileInView` (end state).

import { VortexLogo } from '@/components/VortexLogo';
// VortexLogo — the animated SVG "V" icon with spinning orbital rings.

import { Starfield } from '@/components/Starfield';
// Starfield — canvas-based animated star background rendered behind all content.

// APP_STORE_URL — single source of truth for the iOS App Store link.
// Update this if the app ID or URL ever changes.
const APP_STORE_URL = 'https://apps.apple.com/us/app/vortrexyn-bubble-pop/id6764064306';

// features — data array for the 2×3 feature card grid.
// Each entry: emoji (icon), title (bold heading), desc (short description).
const features = [
  { emoji: '🫧', title: '7 Bubble Types', desc: 'From 1pt commons to rare 20pt stars — every tap counts.' },
  { emoji: '🏆', title: 'Global Leaderboard', desc: 'Every difficulty, speed, and time combo has its own ranking.' },
  { emoji: '⚡', title: 'Four Difficulty Modes', desc: 'Easy, Medium, Hard, and Extreme — find your chaos level.' },
  { emoji: '🔥', title: 'Streak Multiplier', desc: '1.5× bonus for same-color chains. Build streaks, shatter records.' },
  { emoji: '⏱️', title: 'Customizable Rounds', desc: 'Set your timer from 30s to 180s and the speed up to 3×.' },
  { emoji: '✨', title: 'Extreme Star Mode', desc: 'Glowing stars fade in and out — tap bright for maximum points.' },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen text-foreground relative overflow-hidden">
      {/* Starfield: fixed canvas layer behind everything (z-index: -1) */}
      <Starfield />

      {/* ── HERO SECTION ─────────────────────────────────────────────── */}
      <section className="pt-28 pb-24 px-4 relative z-10 flex flex-col items-center text-center">

        {/* Logo with three decorative orbital ring ellipses drawn in SVG.
            Each ring uses a different linear gradient (cyan→purple, purple→blue, cyan→blue).
            The VortexLogo sits on top of the rings at z-10. */}
        <motion.div
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.9, ease: 'easeOut' }}
          className="relative mb-10 w-40 h-40 flex items-center justify-center"
        >
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 160 160" fill="none">
            {/* Three ellipses at different angles create the orbital ring effect */}
            <ellipse cx="80" cy="80" rx="72" ry="36" stroke="url(#ringA)" strokeWidth="1.5" opacity="0.6" />
            <ellipse cx="80" cy="80" rx="60" ry="60" stroke="url(#ringB)" strokeWidth="1" opacity="0.3" />
            <ellipse cx="80" cy="80" rx="48" ry="72" stroke="url(#ringC)" strokeWidth="1.5" opacity="0.5" />
            <defs>
              <linearGradient id="ringA" x1="0" y1="0" x2="160" y2="0">
                <stop stopColor="#00E5FF" />
                <stop offset="1" stopColor="#9B5DE5" />
              </linearGradient>
              <linearGradient id="ringB" x1="0" y1="0" x2="0" y2="160">
                <stop stopColor="#9B5DE5" />
                <stop offset="1" stopColor="#0A84FF" />
              </linearGradient>
              <linearGradient id="ringC" x1="0" y1="0" x2="160" y2="160">
                <stop stopColor="#00E5FF" />
                <stop offset="1" stopColor="#0A84FF" />
              </linearGradient>
            </defs>
          </svg>
          <VortexLogo className="w-16 h-16 relative z-10" />
        </motion.div>

        {/* Two-line title: "VORTREXYN" in cyan→purple gradient, "Bubble Pop" in white.
            vortrexyn-gradient-text class is defined in index.css. */}
        <motion.h1
          initial={{ y: 24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.25 }}
          className="tracking-tight leading-none mb-6"
        >
          <span className="block text-5xl md:text-7xl font-extrabold vortrexyn-gradient-text">VORTREXYN</span>
          <span className="block text-5xl md:text-7xl font-extrabold text-white mt-1">Bubble Pop</span>
        </motion.h1>

        {/* Subtitle — short tagline under the title */}
        <motion.p
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.38 }}
          className="text-lg md:text-xl text-muted-foreground max-w-xl mb-10"
        >
          The cosmic arcade game where every bubble counts.<br />
          Rack up points, build streaks, and conquer the galaxy leaderboard.
        </motion.p>

        {/* CTA Buttons — App Store (active link) + Android (disabled placeholder) */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="flex flex-col sm:flex-row gap-4 items-center justify-center"
        >
          {/* App Store button — links to APP_STORE_URL, opens in new tab */}
          <a
            href={APP_STORE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 bg-primary text-primary-foreground px-8 py-4 rounded-xl font-bold text-lg hover:opacity-90 transition-opacity shadow-[0_0_24px_rgba(0,229,255,0.35)]"
          >
            {/* Inline Apple SVG icon */}
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
            </svg>
            App Store
          </a>
          {/* Android button — disabled until Android version is released */}
          <button
            disabled
            className="px-8 py-4 rounded-xl font-bold text-lg bg-white/8 text-white/40 cursor-not-allowed border border-white/10"
          >
            Android — Coming Soon
          </button>
        </motion.div>
      </section>

      {/* ── FEATURES SECTION ─────────────────────────────────────────── */}
      {/* id="features" allows the navbar "Features" link (href="/#features") to scroll here */}
      <section id="features" className="py-24 relative z-10 bg-black/30 backdrop-blur-sm border-y border-white/5">
        <div className="container mx-auto px-4">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-5xl font-bold mb-4">
              Everything you'll{' '}
              <span className="vortrexyn-gradient-text">love</span>
            </h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              Built from the ground up for fast, addictive cosmic fun.
            </p>
          </div>

          {/* Feature cards grid — maps over the `features` array above.
              whileInView triggers the animation when the card scrolls into view.
              viewport={{ once: true }} means the animation only plays once. */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 max-w-5xl mx-auto">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 28 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }} // stagger: each card appears 80ms after the previous
                className="p-6 rounded-2xl bg-white/5 border border-white/8 hover:border-white/20 hover:bg-white/8 transition-all"
              >
                <div className="text-4xl mb-4">{f.emoji}</div>
                <h3 className="text-lg font-bold mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA SECTION ────────────────────────────────────────── */}
      {/* Gradient fades upward from the brand cyan color to transparent */}
      <section className="py-32 relative z-10 text-center px-4 bg-gradient-to-t from-primary/10 to-transparent">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-4xl md:text-6xl font-extrabold mb-4"
        >
          Ready to Pop?
        </motion.h2>
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.15 }}
          className="text-muted-foreground text-lg mb-10"
        >
          Download free on iPhone and start climbing the galaxy leaderboard.
        </motion.p>
        {/* Main CTA button — same APP_STORE_URL as hero, glows on hover via scale transform */}
        <motion.a
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.25 }}
          href={APP_STORE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-3 bg-primary text-primary-foreground px-10 py-5 rounded-xl font-bold text-xl hover:scale-105 transition-transform shadow-[0_0_32px_rgba(0,229,255,0.4)]"
        >
          <svg className="w-7 h-7" viewBox="0 0 24 24" fill="currentColor">
            <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
          </svg>
          Play VORTREXYN Bubble Pop Free
        </motion.a>
      </section>
    </div>
  );
}
