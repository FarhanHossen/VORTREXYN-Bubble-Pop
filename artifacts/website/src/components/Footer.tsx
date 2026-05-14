// Footer.tsx — Bottom footer shown on every page.
// Contains three sections laid out horizontally on desktop, stacked on mobile:
//   - Left:   logo + full game name
//   - Center: Privacy Policy link and support email contact
//   - Right:  copyright notice (year is generated dynamically)
//
// To add more footer links, add them inside the center <div>.
// To change the support email, update the mailto href below.

import React from 'react';
import { VortexLogo } from './VortexLogo';
// VortexLogo — the animated "V" SVG icon.

import { Link } from 'wouter';
// Link — wouter client-side navigation (no full page reload).

export function Footer() {
  return (
    // border-t adds a subtle top border separating footer from page content.
    // bg-background/50 gives it a slightly transparent dark background.
    <footer className="border-t border-white/10 py-12 bg-background/50 relative z-10">
      <div className="container mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-6">

        {/* Left — Brand mark */}
        <div className="flex items-center gap-2">
          <VortexLogo className="w-8 h-8" />
          <span className="font-bold text-lg vortrexyn-gradient-text">VORTREXYN</span>
          <span className="font-bold text-lg text-white">Bubble Pop</span>
        </div>

        {/* Center — Utility links */}
        <div className="flex gap-6 text-sm text-muted-foreground">
          {/* Client-side route to /privacy */}
          <Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>

          {/* Opens default email client with support address pre-filled */}
          <a href="mailto:support@vortrexyn.app" className="hover:text-white transition-colors">Contact Support</a>
        </div>

        {/* Right — Copyright. new Date().getFullYear() always shows the current year. */}
        <p className="text-sm text-muted-foreground">© {new Date().getFullYear()} VORTREXYN. All rights reserved.</p>
      </div>
    </footer>
  );
}
