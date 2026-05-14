// Navbar.tsx — Fixed top navigation bar shown on every page.
// Stays at the top of the viewport as the user scrolls (position: fixed, z-50).
// Contains:
//   - Left: logo icon + full game name (links back to homepage)
//   - Right: Features anchor link, Privacy page link, Download CTA button
//
// To add a new nav link, add an <a> or <Link> inside the right-side div.
// To change the Download button URL, update the href below.

import React from 'react';
import { Link } from 'wouter';
// Link — wouter's client-side navigation component (no full page reload).

import { VortexLogo } from './VortexLogo';
// VortexLogo — the animated "V" SVG icon used in both Navbar and Footer.

export function Navbar() {
  return (
    // Fixed bar: bg-background/80 + backdrop-blur gives the frosted glass look.
    // border-b adds a subtle bottom border separating nav from page content.
    <nav className="fixed top-0 w-full z-50 bg-background/80 backdrop-blur-md border-b border-white/10">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">

        {/* Left — Logo + game name, clicks back to homepage */}
        <Link href="/" className="flex items-center gap-2">
          <VortexLogo className="w-8 h-8" />
          {/* "VORTREXYN" in brand gradient, "Bubble Pop" in white.
              "Bubble Pop" is hidden on very small screens (hidden sm:inline). */}
          <span className="font-bold text-lg tracking-wider vortrexyn-gradient-text">VORTREXYN</span>
          <span className="font-bold text-lg text-white hidden sm:inline">Bubble Pop</span>
        </Link>

        {/* Right — Navigation links + Download button */}
        <div className="flex items-center gap-6 text-sm font-medium">
          {/* Anchor link: scrolls to the #features section on the landing page */}
          <a href="/#features" className="text-muted-foreground hover:text-white transition-colors">Features</a>

          {/* Client-side link to the /privacy route */}
          <Link href="/privacy" className="text-muted-foreground hover:text-white transition-colors">Privacy</Link>

          {/* Download CTA — opens App Store in a new tab */}
          <a href="https://apps.apple.com/us/app/vortrexyn-bubble-pop/id6764064306" target="_blank" rel="noopener noreferrer" className="bg-primary text-primary-foreground px-4 py-2 rounded-full hover:opacity-90 transition-opacity">
            Download
          </a>
        </div>
      </div>
    </nav>
  );
}
