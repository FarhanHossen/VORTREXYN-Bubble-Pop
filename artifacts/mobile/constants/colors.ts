/**
 * colors.ts — Design Tokens
 *
 * Central color palette for the entire app. All screens and components
 * should read colors via the `useColors()` hook (hooks/useColors.ts)
 * rather than importing this file directly, so the app can switch
 * between light and dark themes automatically based on the device setting.
 *
 * Token guide:
 *   background        — main screen background (deep space navy)
 *   foreground        — primary text / icon color
 *   card              — slightly lighter surface for cards and badges
 *   cardForeground    — text on card surfaces
 *   primary           — main action color (cyan #00E5FF used for buttons and highlights)
 *   primaryForeground — text on primary-colored surfaces
 *   secondary         — secondary surface color (used for chips and tags)
 *   muted             — subtle background (same as secondary here)
 *   mutedForeground   — de-emphasized text (labels, hints, timestamps)
 *   accent            — purple highlight used for decorative elements
 *   accentForeground  — text on accent-colored surfaces
 *   destructive       — red used for delete / error actions
 *   border            — divider / border color
 *   input             — input field background / border color
 *   radius            — global border-radius token (12px)
 */

const colors = {
  light: {
    text: "#E0E0FF",              // Main text — soft white with a purple tint
    tint: "#00E5FF",              // App tint color (used by navigation bar, etc.)
    background: "#070718",        // Deep space navy — main screen background
    foreground: "#E0E0FF",        // Primary text on backgrounds
    card: "#12122A",              // Slightly lighter navy for cards and badges
    cardForeground: "#E0E0FF",    // Text color on card surfaces
    primary: "#00E5FF",           // Cyan — main interactive / action color
    primaryForeground: "#000000", // Black text on cyan buttons for contrast
    secondary: "#1A1A3A",         // Dark navy used for chips and secondary surfaces
    secondaryForeground: "#E0E0FF",
    muted: "#1A1A3A",             // Same as secondary — subtle, non-interactive surfaces
    mutedForeground: "#6B6B9B",   // Muted purple-grey for labels and hints
    accent: "#7C3AED",            // Purple used for highlights and decorative rings
    accentForeground: "#ffffff",
    destructive: "#ef4444",       // Red used for delete / danger actions
    destructiveForeground: "#ffffff",
    border: "#1E1E3A",            // Subtle divider / border color
    input: "#1E1E3A",             // Input field border / background
  },
  // No dark key — app uses "light" palette as its only theme (the design IS dark)
  radius: 12,                     // Global border-radius token in pixels
};

export default colors;
