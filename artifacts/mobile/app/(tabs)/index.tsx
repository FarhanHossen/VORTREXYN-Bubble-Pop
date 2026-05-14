/**
 * index.tsx — Main Menu Screen
 *
 * The home screen of VORTREXYN Bubble Pop. Shows a full-screen animated splash
 * on the first visit, then fades into the main menu.
 *
 * Splash screen (SplashScreen component):
 *   Plays once per app session (controlled by the module-level `hasShownSplash`
 *   flag). Shows the VortexLogo with a spring entrance, then fades out after ~3s.
 *
 * Main menu (MainMenuScreen component):
 *   - Header: VortexLogo + VORTREXYN / BUBBLE POP title + SIGN OUT button
 *   - Welcome strip: shows the logged-in user's display name
 *   - Settings card: four selectors (Difficulty / Game Time / Max Bubbles / Speed)
 *     · Extreme difficulty hides Max Bubbles and shows an "entire screen" hint
 *   - PLAY button: navigates to game.tsx passing all settings as URL params
 *   - SCORES button: navigates to the leaderboard screen
 *   - Points guide: shows all 7 bubble colors with their point values + streak bonus
 *
 * Auth guard:
 *   After the splash finishes and auth has loaded, if there is no logged-in user
 *   the screen immediately redirects to the login screen.
 *
 * VortexLogo geometry (shared reference):
 *   size s → ellipse width rW=s*0.9, height rH=s*0.3, border-radius rBR=s*0.15
 *   Three ellipses at 0° (cyan #00E5FF) / 60° (purple #9B5DE5) / -60° (blue #0A84FF)
 *   Dark core #02021A at 74% of size, glowing V at fontSize s*0.44, center dot at s*0.555
 */

import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";

interface SyncStatus {
  status: "pushed" | "skipped" | "failed";
  synced_at: string;
  cycle_duration_s: number;
}

function getApiBase(): string {
  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  if (domain) return `https://${domain}`;
  return "";
}

async function fetchSyncStatus(): Promise<SyncStatus | null> {
  try {
    const res = await fetch(`${getApiBase()}/api/sync-status`);
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

function formatRelativeTime(isoString: string): string {
  const diffMs = Date.now() - new Date(isoString).getTime();
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return "just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return `${Math.floor(diffHr / 24)}d ago`;
}

const STATUS_COLORS = {
  pushed:  { text: "#30D158", dot: "#30D158" },
  skipped: { text: "#8E8E93", dot: "#8E8E93" },
  failed:  { text: "#FF3B30", dot: "#FF3B30" },
} as const;

function SyncStatusPill({ syncStatus }: { syncStatus: SyncStatus | null }) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!syncStatus) return;
    const id = setInterval(() => setTick((n) => n + 1), 30000);
    return () => clearInterval(id);
  }, [syncStatus]);

  if (!syncStatus) return null;

  const cfg = STATUS_COLORS[syncStatus.status] ?? STATUS_COLORS.skipped;
  const label = syncStatus.status.toUpperCase();
  const relTime = formatRelativeTime(syncStatus.synced_at);

  return (
    <View style={pillStyles.wrap}>
      <View style={[pillStyles.dot, { backgroundColor: cfg.dot }]} />
      <Text style={pillStyles.label}>
        <Text style={[pillStyles.status, { color: cfg.text }]}>{label}</Text>
        {"  "}
        <Text style={pillStyles.time}>Last sync {relTime}</Text>
      </Text>
    </View>
  );
}

const pillStyles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  label: {
    fontSize: 11,
    fontWeight: "600",
  },
  status: {
    fontWeight: "800",
    letterSpacing: 1,
    fontSize: 10,
  },
  time: {
    color: "#4A4A7A",
    fontSize: 11,
  },
});

const { width: SW, height: SH } = Dimensions.get("window");

let hasShownSplash = false;

const TIME_OPTIONS = [30, 60, 90, 120, 180];
const BUBBLE_OPTIONS = [5, 10, 15, 20, 30];

const BG_BUBBLES = [
  { x: 0.08, y: 0.12, size: 90,  color: "rgba(0,229,255,0.07)",   delay: 0 },
  { x: 0.88, y: 0.07, size: 65,  color: "rgba(124,58,237,0.10)",  delay: 600 },
  { x: 0.04, y: 0.62, size: 110, color: "rgba(255,100,50,0.05)",  delay: 1200 },
  { x: 0.78, y: 0.52, size: 80,  color: "rgba(48,209,88,0.07)",   delay: 400 },
  { x: 0.55, y: 0.18, size: 50,  color: "rgba(10,132,255,0.09)",  delay: 900 },
  { x: 0.92, y: 0.8,  size: 95,  color: "rgba(255,214,10,0.05)",  delay: 200 },
  { x: 0.18, y: 0.88, size: 70,  color: "rgba(191,90,242,0.09)",  delay: 700 },
  { x: 0.42, y: 0.75, size: 55,  color: "rgba(0,229,255,0.06)",   delay: 1500 },
];

const MENU_STARS = Array.from({ length: 70 }, () => ({
  x: Math.random() * SW,
  y: Math.random() * SH,
  r: Math.random() < 0.25 ? 1.8 : Math.random() < 0.55 ? 1.2 : 0.7,
  o: Math.random() * 0.5 + 0.15,
}));

const LEGEND_BUBBLES = [
  { color: "#FF3B30", pts: 1,  label: "Red",    glow: "#FF3B30" },
  { color: "#FF9500", pts: 3,  label: "Orange",  glow: "#FF9500" },
  { color: "#30D158", pts: 5,  label: "Green",   glow: "#30D158" },
  { color: "#0A84FF", pts: 8,  label: "Blue",    glow: "#0A84FF" },
  { color: "#BF5AF2", pts: 12, label: "Purple",  glow: "#BF5AF2" },
  { color: "#FFD60A", pts: 15, label: "Gold",    glow: "#FFD60A" },
  { color: "#00E5FF", pts: 20, label: "Cyan",    glow: "#00E5FF" },
];

function VortexLogo({ size = 100 }: { size?: number }) {
  const spinAnim  = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(spinAnim, {
        toValue: 1,
        duration: 7000,
        easing: Easing.linear,
        useNativeDriver: false,
      })
    ).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.06, duration: 2200, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
        Animated.timing(pulseAnim, { toValue: 1,    duration: 2200, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
      ])
    ).start();
  }, []);

  const spinInterp = spinAnim.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });

  const s   = size;
  const rW  = s * 0.9;
  const rH  = s * 0.3;
  const rBR = s * 0.15;
  const rBW = Math.max(1.5, s * 0.026);
  const rL  = (s - rW) / 2;
  const rT  = (s - rH) / 2;
  const dot = Math.max(4, s * 0.1);

  return (
    <Animated.View
      style={{
        width: s,
        height: s,
        borderRadius: s / 2,
        alignItems: "center",
        justifyContent: "center",
        transform: [{ scale: pulseAnim }],
        shadowColor: "#00E5FF",
        shadowOffset: { width: 0, height: 0 },
        shadowRadius: s * 0.38,
        shadowOpacity: 0.9,
        elevation: 22,
      }}
    >
      {/* Dark core */}
      <View style={{
        position: "absolute",
        width: s * 0.74, height: s * 0.74,
        borderRadius: s * 0.37,
        backgroundColor: "#02021A",
        top: s * 0.13, left: s * 0.13,
      }} />

      {/* Three spinning orbital ellipses */}
      <Animated.View style={{
        position: "absolute",
        width: s, height: s,
        transform: [{ rotate: spinInterp }],
      }}>
        {/* Cyan ring — base angle 0° */}
        <View style={{
          position: "absolute",
          width: rW, height: rH,
          borderRadius: rBR,
          borderWidth: rBW,
          borderColor: "#00E5FF",
          backgroundColor: "transparent",
          left: rL, top: rT,
          opacity: 0.9,
        }} />
        {/* Purple ring — offset 60° */}
        <View style={{
          position: "absolute",
          width: rW, height: rH,
          borderRadius: rBR,
          borderWidth: rBW,
          borderColor: "#9B5DE5",
          backgroundColor: "transparent",
          left: rL, top: rT,
          opacity: 0.85,
          transform: [{ rotate: "60deg" }],
        }} />
        {/* Blue ring — offset -60° */}
        <View style={{
          position: "absolute",
          width: rW, height: rH,
          borderRadius: rBR,
          borderWidth: rBW,
          borderColor: "#0A84FF",
          backgroundColor: "transparent",
          left: rL, top: rT,
          opacity: 0.85,
          transform: [{ rotate: "-60deg" }],
        }} />
      </Animated.View>

      {/* Glowing V */}
      <Text style={{
        position: "absolute",
        color: "#00E5FF",
        fontSize: s * 0.44,
        fontWeight: "900",
        letterSpacing: -1,
        textShadowColor: "#00E5FF",
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: s * 0.15,
        top: s * 0.21,
        left: 0, right: 0,
        textAlign: "center",
      }}>V</Text>

      {/* Center dot */}
      <View style={{
        position: "absolute",
        width: dot, height: dot,
        borderRadius: dot / 2,
        backgroundColor: "#FFFFFF",
        top: s * 0.555 - dot / 2,
        left: s / 2 - dot / 2,
        shadowColor: "#00E5FF",
        shadowOffset: { width: 0, height: 0 },
        shadowRadius: 6,
        shadowOpacity: 1,
      }} />

      {/* Outer glow ring */}
      <View style={{
        position: "absolute",
        width: s, height: s,
        borderRadius: s / 2,
        borderWidth: 1,
        borderColor: "rgba(0,229,255,0.28)",
      }} />
    </Animated.View>
  );
}

function BubbleLogo({ size = 100 }: { size?: number }) {
  return <VortexLogo size={size} />;
}

function SplashScreen({ onDone }: { onDone: () => void }) {
  const insets = useSafeAreaInsets();

  const logoScale    = useRef(new Animated.Value(0)).current;
  const logoOpacity  = useRef(new Animated.Value(0)).current;
  const brandY       = useRef(new Animated.Value(24)).current;
  const brandOpacity = useRef(new Animated.Value(0)).current;
  const titleY       = useRef(new Animated.Value(32)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const wrapperOpacity = useRef(new Animated.Value(1)).current;

  const splashBubbles = useRef(
    BG_BUBBLES.map(() => new Animated.Value(SH + 50))
  ).current;

  const startFloating = useCallback(() => {
    splashBubbles.forEach((anim, i) => {
      const b = BG_BUBBLES[i];
      const duration = 5000 + Math.random() * 4000;
      Animated.loop(
        Animated.timing(anim, {
          toValue: -(b.size + 50),
          duration,
          useNativeDriver: false,
          easing: Easing.linear,
        })
      ).start();
    });
  }, []);

  useEffect(() => {
    startFloating();

    Animated.sequence([
      Animated.delay(200),
      Animated.parallel([
        Animated.spring(logoScale, {
          toValue: 1,
          useNativeDriver: false,
          bounciness: 14,
          speed: 6,
        }),
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: false,
        }),
      ]),
      Animated.delay(180),
      Animated.parallel([
        Animated.timing(brandY, { toValue: 0, duration: 450, easing: Easing.out(Easing.cubic), useNativeDriver: false }),
        Animated.timing(brandOpacity, { toValue: 1, duration: 450, useNativeDriver: false }),
      ]),
      Animated.delay(120),
      Animated.parallel([
        Animated.timing(titleY, { toValue: 0, duration: 500, easing: Easing.out(Easing.cubic), useNativeDriver: false }),
        Animated.timing(titleOpacity, { toValue: 1, duration: 500, useNativeDriver: false }),
      ]),
      Animated.delay(150),
      Animated.timing(taglineOpacity, { toValue: 1, duration: 350, useNativeDriver: false }),
      Animated.delay(1100),
      Animated.timing(wrapperOpacity, {
        toValue: 0,
        duration: 700,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: false,
      }),
    ]).start(() => onDone());
  }, []);

  const topPad = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;

  return (
    <Animated.View style={[StyleSheet.absoluteFill, { opacity: wrapperOpacity, zIndex: 100 }]}>
      <LinearGradient
        colors={["#01010D", "#04041A", "#080628", "#0C0835"]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.3, y: 0 }}
        end={{ x: 0.7, y: 1 }}
      />
      {splashBubbles.map((anim, i) => {
        const b = BG_BUBBLES[i];
        return (
          <Animated.View
            key={i}
            style={{
              position: "absolute",
              left: b.x * SW - b.size / 2,
              top: anim,
              width: b.size,
              height: b.size,
              borderRadius: b.size / 2,
              backgroundColor: b.color,
            }}
          />
        );
      })}
      <View style={[styles.splashContent, { paddingTop: topPad, paddingBottom: insets.bottom + 40 }]}>
        <Animated.View style={{ transform: [{ scale: logoScale }], opacity: logoOpacity, marginBottom: 28 }}>
          <BubbleLogo size={120} />
        </Animated.View>
        <Animated.Text style={[styles.splashBrand, { opacity: brandOpacity, transform: [{ translateY: brandY }] }]}>
          VORTREXYN
        </Animated.Text>
        <Animated.Text style={[styles.splashTitle, { opacity: titleOpacity, transform: [{ translateY: titleY }] }]}>
          BUBBLE{"\n"}POP
        </Animated.Text>
        <Animated.Text style={[styles.splashTagline, { opacity: taglineOpacity }]}>
          Pop. Score. Dominate.
        </Animated.Text>
      </View>
    </Animated.View>
  );
}

export default function MainMenuScreen() {
  const insets = useSafeAreaInsets();
  const { user, loading: authLoading, signOut, deleteAccount } = useAuth();
  const { guest } = useLocalSearchParams<{ guest?: string }>();
  const [splashAnimDone, setSplashAnimDone] = useState(hasShownSplash);
  const [splashDone, setSplashDone] = useState(hasShownSplash);
  const [timeLimit, setTimeLimit] = useState(60);
  const [maxBubbles, setMaxBubbles] = useState(15);
  const [speed, setSpeed] = useState(1);
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard" | "extreme">("easy");
  const menuOpacity = useRef(new Animated.Value(hasShownSplash ? 1 : 0)).current;
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);

  useEffect(() => {
    fetchSyncStatus().then(setSyncStatus);
    const id = setInterval(() => fetchSyncStatus().then(setSyncStatus), 30000);
    return () => clearInterval(id);
  }, []);

  const handleSplashDone = useCallback(() => {
    hasShownSplash = true;
    setSplashAnimDone(true);
  }, []);

  useEffect(() => {
    if (!splashAnimDone || authLoading) return;
    if (!user && guest !== "1") {
      router.replace("/(tabs)/login");
      return;
    }
    setSplashDone(true);
    Animated.timing(menuOpacity, {
      toValue: 1,
      duration: hasShownSplash ? 150 : 500,
      useNativeDriver: false,
    }).start();
  }, [splashAnimDone, authLoading, user, guest]);

  const handleSignOut = async () => {
    await signOut();
    router.replace("/(tabs)/login");
  };

  const handleDeleteAccount = () => {
    const { Alert } = require("react-native");
    Alert.alert(
      "Delete Account",
      "This will permanently delete your account and all your scores. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteAccount();
              router.replace("/(tabs)/login");
            } catch {
              Alert.alert(
                "Sign in required",
                "For security, please sign out and sign in again before deleting your account."
              );
            }
          },
        },
      ]
    );
  };


  const handlePlay = () => {
    const playerName = user?.displayName || user?.email?.split("@")[0] || "Guest";
    router.push({
      pathname: "/(tabs)/game",
      params: {
        name: playerName,
        timeLimit: String(timeLimit),
        maxBubbles: String(maxBubbles),
        difficulty,
        speed: String(speed),
      },
    });
  };

  const topPad = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;
  const botPad = Platform.OS === "web" ? Math.max(insets.bottom, 34) : insets.bottom || 16;
  const displayName = user?.displayName || user?.email?.split("@")[0] || "";

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#01010D", "#04041A", "#080628", "#0C0835"]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.3, y: 0 }}
        end={{ x: 0.7, y: 1 }}
      />
      {/* Nebula orbs */}
      <View style={styles.nebulaTR} />
      <View style={styles.nebulaBL} />
      {/* Static star field */}
      {MENU_STARS.map((s, i) => (
        <View
          key={i}
          style={{
            position: "absolute",
            left: s.x,
            top: s.y,
            width: s.r * 2,
            height: s.r * 2,
            borderRadius: s.r,
            backgroundColor: "#FFFFFF",
            opacity: s.o,
          }}
        />
      ))}

      <Animated.View
        style={[styles.menuWrapper, { opacity: menuOpacity }]}
        pointerEvents={splashDone ? "auto" : "none"}
      >
        <View style={[styles.menuContent, { paddingTop: topPad + 12, paddingBottom: botPad }]}>

          {/* ── Header ── */}
          <View style={styles.header}>
            <BubbleLogo size={52} />
            <View style={styles.headerText}>
              <Text style={styles.headerBrand}>VORTREXYN</Text>
              <Text style={styles.headerTitle}>BUBBLE POP</Text>
            </View>
            {user ? (
              <View style={styles.headerBtns}>
                <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut} activeOpacity={0.7}>
                  <Text style={styles.signOutText}>SIGN OUT</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.deleteBtn} onPress={handleDeleteAccount} activeOpacity={0.7}>
                  <Text style={styles.deleteBtnText}>DELETE{"\n"}ACCOUNT</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={styles.signOutBtn} onPress={() => router.replace("/(tabs)/login")} activeOpacity={0.7}>
                <Text style={styles.signOutText}>SIGN IN</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* ── Welcome strip ── */}
          {user ? (
            <View style={styles.welcomeStrip}>
              <Text style={styles.welcomeText}>
                Welcome back, <Text style={styles.welcomeName}>{displayName || "Player"}</Text>
              </Text>
            </View>
          ) : (
            <View style={styles.welcomeStrip}>
              <Text style={styles.welcomeText}>
                Playing as <Text style={styles.welcomeName}>Guest</Text>
                {"  "}
                <Text style={styles.signInHint} onPress={() => router.replace("/(tabs)/login")}>
                  Sign in to save scores →
                </Text>
              </Text>
            </View>
          )}

          {/* ── Settings card ── */}
          <View style={styles.card}>
            {/* Difficulty — always first */}
            <Text style={styles.label}>Difficulty: <Text style={styles.labelValue}>{difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}</Text></Text>
            <View style={styles.optionRow}>
              {(["easy", "medium", "hard", "extreme"] as const).map((d) => {
                const diffColor = d === "easy" ? "#30D158" : d === "medium" ? "#FF9500" : d === "hard" ? "#FF3B30" : "#FF2D78";
                const isActive  = difficulty === d;
                return (
                  <TouchableOpacity
                    key={d}
                    style={[
                      styles.chip,
                      styles.diffChip,
                      isActive && { backgroundColor: diffColor + "22", borderColor: diffColor + "BB" },
                    ]}
                    onPress={() => setDifficulty(d)}
                  >
                    <Text style={[styles.chipText, isActive && { color: diffColor }]}>
                      {d.charAt(0).toUpperCase() + d.slice(1)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Extreme mode hint */}
            {difficulty === "extreme" && (
              <View style={styles.extremeHint}>
                <Text style={styles.extremeHintText}>⚡ Stars spawn across the entire screen — no bubble limit</Text>
              </View>
            )}

            {/* Game Time */}
            <Text style={styles.label}>Game Time: <Text style={styles.labelValue}>{timeLimit}s</Text></Text>
            <View style={styles.optionRow}>
              {TIME_OPTIONS.map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[styles.chip, timeLimit === t && styles.chipActive]}
                  onPress={() => setTimeLimit(t)}
                >
                  <Text style={[styles.chipText, timeLimit === t && styles.chipTextActive]}>
                    {t}s
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Max Bubbles — hidden for Extreme */}
            {difficulty !== "extreme" && (
              <>
                <Text style={styles.label}>Max Bubbles: <Text style={styles.labelValue}>{maxBubbles}</Text></Text>
                <View style={styles.optionRow}>
                  {BUBBLE_OPTIONS.map((b) => (
                    <TouchableOpacity
                      key={b}
                      style={[styles.chip, maxBubbles === b && styles.chipActive]}
                      onPress={() => setMaxBubbles(b)}
                    >
                      <Text style={[styles.chipText, maxBubbles === b && styles.chipTextActive]}>
                        {b}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            {/* Speed */}
            <Text style={styles.label}>Speed: <Text style={styles.labelValue}>{speed}×</Text></Text>
            <View style={[styles.optionRow, { marginBottom: 0 }]}>
              {([1, 2, 3] as const).map((s) => (
                <TouchableOpacity
                  key={s}
                  style={[styles.chip, styles.diffChip, speed === s && styles.chipActive]}
                  onPress={() => setSpeed(s)}
                >
                  <Text style={[styles.chipText, speed === s && styles.chipTextActive]}>
                    {s}×
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* ── Buttons ── */}
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.playBtn}
              onPress={handlePlay}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={["#00E5FF", "#0066CC"]}
                style={StyleSheet.absoluteFill}
                borderRadius={18}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              />
              <View style={styles.playBtnShine} />
              <Text style={styles.playBtnText}>PLAY</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.scoresBtn}
              onPress={() => router.push("/(tabs)/scores")}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={["#7C3AED", "#4C1D95"]}
                style={StyleSheet.absoluteFill}
                borderRadius={18}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              />
              <View style={styles.playBtnShine} />
              <Text style={styles.scoresBtnText}>SCORES</Text>
            </TouchableOpacity>
          </View>

          {/* ── Sync History ── */}
          <TouchableOpacity
            style={styles.syncHistoryBtn}
            onPress={() => router.push("/(tabs)/sync-history")}
            activeOpacity={0.8}
          >
            <Text style={styles.syncHistoryText}>📡  SYNC HISTORY</Text>
            <SyncStatusPill syncStatus={syncStatus} />
          </TouchableOpacity>

          {/* ── Points guide ── */}
          <View style={styles.legend}>
            <Text style={styles.legendTitle}>POINTS GUIDE</Text>
            <View style={styles.legendRow}>
              {LEGEND_BUBBLES.map(({ color, pts, label, glow }) => (
                <View key={label} style={styles.legendItem}>
                  <View style={[styles.legendBubble, { backgroundColor: color, shadowColor: glow }]}>
                    <View style={styles.legendShine} />
                  </View>
                  <Text style={styles.legendPts}>{pts}pt</Text>
                </View>
              ))}
            </View>
            <View style={styles.bonusBadge}>
              <Text style={styles.bonusText}>Same color streak = 1.5× bonus</Text>
            </View>
          </View>

        </View>
      </Animated.View>

      {!splashDone && <SplashScreen onDone={handleSplashDone} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  nebulaTR: {
    position: "absolute",
    top: -90,
    right: -70,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: "rgba(124,58,237,0.13)",
    shadowColor: "#7C3AED",
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 90,
    shadowOpacity: 0.55,
  },
  nebulaBL: {
    position: "absolute",
    bottom: -70,
    left: -70,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: "rgba(0,229,255,0.09)",
    shadowColor: "#00E5FF",
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 70,
    shadowOpacity: 0.4,
  },

  splashContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  splashBrand: {
    fontSize: 14,
    fontWeight: "800",
    color: "#00E5FF",
    letterSpacing: 8,
    marginBottom: 8,
  },
  splashTitle: {
    fontSize: 56,
    fontWeight: "900",
    color: "#FFFFFF",
    textAlign: "center",
    lineHeight: 58,
    letterSpacing: 6,
    textShadowColor: "rgba(0,229,255,0.35)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
  splashTagline: {
    marginTop: 20,
    fontSize: 14,
    color: "#7A7AB0",
    fontWeight: "600",
    letterSpacing: 2,
  },

  menuWrapper: { ...StyleSheet.absoluteFillObject },
  menuContent: {
    flex: 1,
    paddingHorizontal: 18,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 12,
  },
  headerText: { flex: 1 },
  headerBrand: {
    fontSize: 10,
    fontWeight: "800",
    color: "#00E5FF",
    letterSpacing: 5,
    marginBottom: 2,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: 3,
    textShadowColor: "rgba(0,229,255,0.3)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  headerBtns: {
    alignItems: "flex-end",
    gap: 6,
  },
  signOutBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(0,229,255,0.25)",
    backgroundColor: "rgba(0,229,255,0.07)",
  },
  signOutText: {
    color: "#00E5FF",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.5,
    textAlign: "center",
  },
  deleteBtn: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255,59,48,0.3)",
    backgroundColor: "rgba(255,59,48,0.07)",
  },
  deleteBtnText: {
    color: "#FF453A",
    fontSize: 8,
    fontWeight: "700",
    letterSpacing: 0.5,
    textAlign: "center",
  },

  statsStrip: {
    flexDirection: "row",
    backgroundColor: "rgba(155,93,229,0.08)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(155,93,229,0.2)",
    paddingVertical: 10,
    marginBottom: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  statItem: { flex: 1, alignItems: "center" },
  statValue: { color: "#E0E0FF", fontSize: 20, fontWeight: "900", letterSpacing: 0.5 },
  statLabel: { color: "#6B6B9B", fontSize: 9, fontWeight: "800", letterSpacing: 2, marginTop: 1 },
  statDivider: { width: 1, height: 32, backgroundColor: "rgba(155,93,229,0.3)" },

  welcomeStrip: {
    backgroundColor: "rgba(0,229,255,0.06)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(0,229,255,0.12)",
    paddingHorizontal: 14,
    paddingVertical: 9,
    marginBottom: 14,
  },
  welcomeText: {
    color: "#9090C0",
    fontSize: 13,
    fontWeight: "500",
  },
  welcomeName: {
    color: "#E0E0FF",
    fontWeight: "700",
  },
  signInHint: {
    color: "#00E5FF",
    fontSize: 12,
    fontWeight: "600",
  },

  card: {
    backgroundColor: "rgba(10,10,30,0.85)",
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
    marginBottom: 16,
    shadowColor: "#00E5FF",
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 18,
    shadowOpacity: 0.06,
    elevation: 4,
  },
  label: {
    color: "#8888BB",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 2,
    textTransform: "uppercase",
    marginBottom: 10,
  },
  labelValue: {
    color: "#00E5FF",
  },
  optionRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 18,
    flexWrap: "wrap",
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  chipActive: {
    backgroundColor: "rgba(0,229,255,0.15)",
    borderColor: "rgba(0,229,255,0.6)",
  },
  diffChip: {
    flex: 1,
    alignItems: "center",
  },
  chipText: {
    color: "#9090C0",
    fontSize: 13,
    fontWeight: "700",
  },
  chipTextActive: {
    color: "#00E5FF",
  },

  buttonRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  playBtn: {
    flex: 1,
    height: 56,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    shadowColor: "#00E5FF",
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 14,
    shadowOpacity: 0.4,
    elevation: 10,
  },
  playBtnShine: {
    position: "absolute",
    top: 6,
    left: 18,
    width: 40,
    height: 12,
    borderRadius: 6,
    backgroundColor: "rgba(255,255,255,0.2)",
    transform: [{ rotate: "-5deg" }],
  },
  playBtnText: {
    color: "#000",
    fontSize: 15,
    fontWeight: "900",
    letterSpacing: 3,
  },
  scoresBtn: {
    flex: 1,
    height: 56,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    shadowColor: "#7C3AED",
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 14,
    shadowOpacity: 0.4,
    elevation: 10,
  },
  scoresBtnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "900",
    letterSpacing: 3,
  },

  syncHistoryBtn: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(0,229,255,0.18)",
    backgroundColor: "rgba(0,229,255,0.05)",
    marginBottom: 14,
  },
  syncHistoryText: {
    color: "#00E5FF",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 2,
    opacity: 0.8,
  },

  legend: {
    alignItems: "center",
  },
  legendTitle: {
    color: "#6A6A9A",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 3,
    marginBottom: 12,
  },
  legendRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 12,
    flexWrap: "wrap",
    justifyContent: "center",
  },
  legendItem: {
    alignItems: "center",
    gap: 5,
  },
  legendBubble: {
    width: 34,
    height: 34,
    borderRadius: 17,
    overflow: "hidden",
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    shadowOpacity: 0.7,
    elevation: 5,
  },
  legendShine: {
    position: "absolute",
    top: 5,
    left: 7,
    width: 12,
    height: 8,
    borderRadius: 5,
    backgroundColor: "rgba(255,255,255,0.55)",
    transform: [{ rotate: "-30deg" }],
  },
  legendPts: {
    color: "#9090C0",
    fontSize: 10,
    fontWeight: "700",
  },
  extremeHint: {
    backgroundColor: "rgba(255,45,120,0.1)",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255,45,120,0.3)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 18,
  },
  extremeHintText: {
    color: "#FF2D78",
    fontSize: 11,
    fontWeight: "700",
    textAlign: "center",
    letterSpacing: 0.3,
  },

  bonusBadge: {
    backgroundColor: "rgba(255,214,10,0.08)",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: "rgba(255,214,10,0.22)",
  },
  bonusText: {
    color: "#FFD60A",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
});
