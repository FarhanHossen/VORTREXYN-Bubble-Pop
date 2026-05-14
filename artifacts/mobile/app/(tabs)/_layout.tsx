/**
 * (tabs)/_layout.tsx — In-App Navigation Stack
 *
 * Defines the slide-based Stack navigator for all main screens:
 *   index   — Main menu (home screen)
 *   login   — Sign in / sign up / forgot password
 *   game    — Active gameplay screen
 *   scores  — Global leaderboard
 *
 * All headers are hidden (headerShown: false) because each screen
 * draws its own custom header to match the space-themed design.
 * The "slide_from_right" animation gives a natural push/pop feel
 * when navigating between screens.
 */

import { Stack } from "expo-router";
import React from "react";

/** Stack navigator wrapping all main screens of the app. */
export default function GameLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: "slide_from_right" }}>
      {/* Home / main menu */}
      <Stack.Screen name="index" />
      {/* Authentication screen (sign in, sign up, forgot password) */}
      <Stack.Screen name="login" />
      {/* Active game screen — receives settings via URL params */}
      <Stack.Screen name="game" />
      {/* Global leaderboard screen */}
      <Stack.Screen name="scores" />
      {/* GitHub sync history screen */}
      <Stack.Screen name="sync-history" />
    </Stack>
  );
}
