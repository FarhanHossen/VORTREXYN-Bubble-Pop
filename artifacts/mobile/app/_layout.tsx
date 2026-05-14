/**
 * _layout.tsx  (Root Layout)
 *
 * This is the entry point for the Expo Router navigation tree. It runs once
 * when the app starts and sets up every global provider that all screens need:
 *
 *   SafeAreaProvider      — safe area insets for notch / Dynamic Island handling
 *   ErrorBoundary         — catches React rendering crashes and shows a fallback UI
 *   AuthProvider          — Firebase auth state (user, signOut, loading)
 *   QueryClientProvider   — React Query client for server-state data fetching
 *   GestureHandlerRootView— required by react-native-gesture-handler
 *   KeyboardProvider      — react-native-keyboard-controller for keyboard handling
 *
 * Font loading:
 *   Inter font weights are pre-loaded here. The native OS splash screen is kept
 *   visible until fonts finish loading (or fail), preventing a flash of unstyled text.
 */

import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AuthProvider } from "@/context/AuthContext";

// Hold the OS splash screen open until fonts are ready
SplashScreen.preventAutoHideAsync();

/** Shared React Query client — caches server responses across all screens. */
const queryClient = new QueryClient();

/**
 * Inner navigation component, kept separate so providers above it
 * can wrap it without causing the Stack navigator to re-mount.
 */
function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerBackTitle: "Back" }}>
      {/* The (tabs) group handles its own headers — hide the Stack header */}
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    </Stack>
  );
}

/** Root layout — mounts providers and gates rendering on font readiness. */
export default function RootLayout() {
  // Load all Inter weights used across the app
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  // Dismiss the OS splash screen once fonts are loaded (or failed — don't block forever)
  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  // Return null (blank screen) until fonts resolve — prevents a flash of unstyled text
  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <AuthProvider>
          <QueryClientProvider client={queryClient}>
            <GestureHandlerRootView>
              <KeyboardProvider>
                <RootLayoutNav />
              </KeyboardProvider>
            </GestureHandlerRootView>
          </QueryClientProvider>
        </AuthProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
