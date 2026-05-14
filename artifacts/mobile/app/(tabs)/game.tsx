/**
 * game.tsx — Game Screen
 *
 * The core gameplay screen for VORTREXYN Bubble Pop. Receives settings as
 * URL params from the main menu (difficulty, timeLimit, maxBubbles, speed)
 * and runs the game loop until the countdown timer hits zero.
 *
 * Game modes:
 *   Easy    — bubbles rise from the bottom only
 *   Medium  — bubbles enter from bottom and top
 *   Hard    — bubbles enter from all four sides
 *   Extreme — stationary glowing stars scattered across the screen that fade
 *             in/out; no bubble cap; points scale with brightness at tap time
 *
 * Scoring:
 *   Each bubble color has a base point value (1 → 20 pts).
 *   Tapping the same color twice in a row earns a 1.5× streak bonus.
 *   Extreme bubbles also multiply by their current opacity (how bright they are).
 *
 * Speed system:
 *   speedOption (1/2/3) — the label shown in the UI and stored in Firestore.
 *   speedMult (2/3/4)   — the actual physics/animation multiplier (speedOption + 1).
 *   Separating these two values prevents score collisions between speed tiers.
 *
 * At game over, the final score is saved to Firestore via saveHighScore().
 */

import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { saveHighScore } from "@/utils/storage";

const { width: SW, height: SH } = Dimensions.get("window");

const BUBBLE_SIZE = 62;
const BS          = BUBBLE_SIZE;

// Static star field — generated once at module load so render is free
const STARS = Array.from({ length: 70 }, () => ({
  x: Math.random() * SW,
  y: Math.random() * SH,
  r: Math.random() < 0.25 ? 1.8 : Math.random() < 0.55 ? 1.2 : 0.7,
  o: Math.random() * 0.5 + 0.15,
}));

type Difficulty  = "easy" | "medium" | "hard" | "extreme";
type BubbleColor = "red" | "orange" | "green" | "blue" | "purple" | "gold" | "cyan";
type SpawnSide   = "bottom" | "top" | "left" | "right";

const BUBBLE_CONFIGS: Record<BubbleColor, { hex: string; points: number; glow: string }> = {
  red:    { hex: "#FF3B30", points: 1,  glow: "#FF3B30" },
  orange: { hex: "#FF9500", points: 3,  glow: "#FF9500" },
  green:  { hex: "#30D158", points: 5,  glow: "#30D158" },
  blue:   { hex: "#0A84FF", points: 8,  glow: "#0A84FF" },
  purple: { hex: "#BF5AF2", points: 12, glow: "#BF5AF2" },
  gold:   { hex: "#FFD60A", points: 15, glow: "#FFD60A" },
  cyan:   { hex: "#00E5FF", points: 20, glow: "#00E5FF" },
};

const SIDES_FOR: Record<Exclude<Difficulty, "extreme">, SpawnSide[]> = {
  easy:   ["bottom"],
  medium: ["bottom", "top"],
  hard:   ["bottom", "top", "left", "right"],
};

function randomColor(): BubbleColor {
  const r = Math.random();
  if (r < 0.35) return "red";
  if (r < 0.60) return "orange";
  if (r < 0.77) return "green";
  if (r < 0.89) return "blue";
  if (r < 0.95) return "purple";
  if (r < 0.98) return "gold";
  return "cyan";
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

interface Bubble {
  id: string;
  color: BubbleColor;
  x: number;
  y: number;
  vx: number;
  vy: number;
  entryAnim: Animated.Value;
  isExtreme?: boolean;
  getOpacity?: () => number; // live opacity value for opacity-based scoring
}

interface FloatingScore {
  id: string;
  x: number;
  y: number;
  points: number;
  anim: Animated.Value;
}

function makeBubble(
  side: SpawnSide,
  areaW: number,
  areaH: number,
  speedMult: number = 1
): Bubble {
  const speed      = (Math.random() * 0.4 + 0.3) * speedMult; // px per 16ms tick
  const entryAnim  = new Animated.Value(0);
  let x = 0, y = 0, vx = 0, vy = 0;

  switch (side) {
    case "bottom":
      x  = Math.random() * (areaW - BS * 2) + BS;
      y  = areaH + BS;
      vx = 0;  vy = -speed;
      break;
    case "top":
      x  = Math.random() * (areaW - BS * 2) + BS;
      y  = -BS;
      vx = 0;  vy = speed;
      break;
    case "left":
      x  = -BS;
      y  = Math.random() * (areaH - BS * 2) + BS;
      vx = speed;  vy = 0;
      break;
    case "right":
      x  = areaW + BS;
      y  = Math.random() * (areaH - BS * 2) + BS;
      vx = -speed;  vy = 0;
      break;
  }

  // Fade in over 300ms once bubble is within the game area
  Animated.timing(entryAnim, {
    toValue: 1,
    duration: 300,
    useNativeDriver: false,
  }).start();

  return { id: generateId(), color: randomColor(), x, y, vx, vy, entryAnim };
}

function isOffScreen(b: Bubble, areaW: number, areaH: number): boolean {
  if (b.isExtreme) return false; // extreme bubbles self-remove via animation
  const pad = BS * 1.5;
  return (
    b.x < -pad || b.x > areaW + pad ||
    b.y < -pad || b.y > areaH + pad
  );
}

// Spawns a stationary star-like bubble that slowly glows in then fades out.
// Points awarded scale with how bright the star is when tapped.
function makeExtremeBubble(
  areaW: number,
  areaH: number,
  existing: { x: number; y: number }[],
  onExpire: (id: string) => void,
  speedMult: number = 1
): Bubble {
  const id      = generateId();
  const pad     = BS * 1.5;
  const minDist = BS * 2.6; // no-overlap minimum distance between centers

  // Try up to 25 times to find a non-overlapping position
  let x = 0, y = 0, attempts = 0;
  do {
    x = pad + Math.random() * (areaW - pad * 2);
    y = pad + Math.random() * (areaH - pad * 2);
    attempts++;
  } while (
    attempts < 25 &&
    existing.some((e) => Math.hypot(e.x - x, e.y - y) < minDist)
  );

  const entryAnim = new Animated.Value(0);

  // Track live brightness so scoring can read it at tap time
  let currentOpacity = 0;
  entryAnim.addListener(({ value }) => { currentOpacity = value; });

  // Very slow star-like pulse; speed multiplier makes the cycle faster
  const pulseDur = Math.round(2800 / speedMult);
  const peakHold = Math.round((400 + Math.random() * 400) / speedMult);
  Animated.sequence([
    Animated.timing(entryAnim, { toValue: 1, duration: pulseDur, useNativeDriver: false }),
    Animated.delay(peakHold),
    Animated.timing(entryAnim, { toValue: 0, duration: pulseDur, useNativeDriver: false }),
  ]).start(({ finished }) => {
    entryAnim.removeAllListeners();
    if (finished) onExpire(id);
  });

  return {
    id,
    color: randomColor(),
    x, y, vx: 0, vy: 0,
    entryAnim,
    isExtreme: true,
    getOpacity: () => currentOpacity,
  };
}

export default function GameScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const params = useLocalSearchParams<{
    name: string; timeLimit: string; maxBubbles: string; difficulty: string; speed: string;
  }>();

  const playerName = params.name ?? "Player";
  const timeLimit  = parseInt(params.timeLimit  ?? "60")  || 60;
  const maxBubbles = parseInt(params.maxBubbles ?? "15")  || 15;
  const difficulty = (params.difficulty ?? "easy") as Difficulty;
  // speedOption = user-chosen label (1, 2 or 3) — stored in Firestore for leaderboard filtering
  // speedMult   = actual physics multiplier (+1 over the label so 1×→2×, 2×→3×, 3×→4×)
  const speedOption = parseFloat(params.speed ?? "1") || 1;
  const speedMult   = speedOption + 1;

  const [bubbles, setBubbles]           = useState<Bubble[]>([]);
  const [score, setScore]               = useState(0);
  const [timeLeft, setTimeLeft]         = useState(timeLimit);
  const [isGameOver, setIsGameOver]     = useState(false);
  const [floatingScores, setFloatingScores] = useState<FloatingScore[]>([]);

  const lastColorRef  = useRef<BubbleColor | null>(null);
  const scoreRef      = useRef(0);
  const isOverRef     = useRef(false);

  const [areaH, setAreaH] = useState(600);
  const [areaW, setAreaW] = useState(375);

  const topPad = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;

  const addFloat = useCallback((x: number, y: number, points: number) => {
    const anim = new Animated.Value(0);
    const fs: FloatingScore = { id: generateId(), x, y, points, anim };
    setFloatingScores((p) => [...p, fs]);
    Animated.timing(anim, { toValue: 1, duration: 800, useNativeDriver: false }).start(() =>
      setFloatingScores((p) => p.filter((f) => f.id !== fs.id))
    );
  }, []);

  const popBubble = useCallback((bubble: Bubble) => {
    if (isOverRef.current) return;
    let pts = BUBBLE_CONFIGS[bubble.color].points;
    // Extreme mode: scale base points by current opacity (how bright the star is)
    if (bubble.isExtreme && bubble.getOpacity) {
      pts = Math.max(1, Math.round(pts * bubble.getOpacity()));
    }
    // Streak bonus: same color in a row earns 1.5x (applied after opacity scaling)
    if (lastColorRef.current === bubble.color) pts = Math.round(pts * 1.5);
    lastColorRef.current = bubble.color;
    scoreRef.current += pts;
    setScore(scoreRef.current);
    setBubbles((p) => p.filter((b) => b.id !== bubble.id));
    addFloat(bubble.x, bubble.y, pts);
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [addFloat]);

  const endGame = useCallback(async () => {
    isOverRef.current = true;
    setIsGameOver(true);
    await saveHighScore(playerName, scoreRef.current, user?.uid ?? "", {
      difficulty,
      timeLimit,
      maxBubbles,
      speed: speedOption,
    });
  }, [playerName, user, difficulty, timeLimit, maxBubbles, speedOption]);

  const handleNavigateMenu = useCallback(() => {
    const dest = !user
      ? ({ pathname: "/(tabs)/" as const, params: { guest: "1" } } as const)
      : ("/(tabs)/" as const);
    router.replace(dest as never);
  }, [user]);

  const handleNavigateLeaderboard = useCallback(() => {
    router.replace("/(tabs)/scores");
  }, []);

  // Stable ref so extreme bubble callbacks can remove bubbles without stale closures
  const setBubblesRef = useRef(setBubbles);
  useEffect(() => { setBubblesRef.current = setBubbles; }, [setBubbles]);

  useEffect(() => {
    if (areaH === 0 || areaW === 0) return;

    const isExtreme = difficulty === "extreme";

    // ── 60fps movement loop (non-extreme only) ───────────
    const gameLoop = isExtreme ? null : setInterval(() => {
      if (isOverRef.current) return;
      setBubbles((prev) =>
        prev
          .map((b) => ({ ...b, x: b.x + b.vx, y: b.y + b.vy }))
          .filter((b) => !isOffScreen(b, areaW, areaH))
      );
    }, 16);

    // ── Spawn loop ───────────────────────────────────────
    const spawner = setInterval(() => {
      if (isOverRef.current) return;

      if (isExtreme) {
        // Hard cap: at most 6 stars visible at once; spawn 1 at a time into an empty gap
        const MAX_EXTREME = 6;
        setBubbles((prev) => {
          if (prev.length >= MAX_EXTREME) return prev;
          const placed: { x: number; y: number }[] = prev.map((b) => ({ x: b.x, y: b.y }));
          const b = makeExtremeBubble(areaW, areaH, placed, (expiredId) => {
            setBubblesRef.current((p) => p.filter((bb) => bb.id !== expiredId));
          }, speedMult);
          return [...prev, b];
        });
      } else {
        const sides     = SIDES_FOR[difficulty as Exclude<Difficulty, "extreme">];
        setBubbles((prev) => {
          const available = maxBubbles - prev.length;
          if (available <= 0) return prev;
          const count = Math.min(Math.floor(Math.random() * 2) + 1, available);
          const fresh = Array.from({ length: count }, () => {
            const side = sides[Math.floor(Math.random() * sides.length)];
            return makeBubble(side, areaW, areaH, speedMult);
          });
          return [...prev, ...fresh];
        });
      }
    }, isExtreme ? Math.round(1500 / speedMult) : Math.round(900 / speedMult));

    // ── Countdown ────────────────────────────────────────
    const timer = setInterval(() => {
      if (isOverRef.current) return;
      setTimeLeft((prev) => {
        const next = prev - 1;
        if (next <= 0) { endGame(); return 0; }
        return next;
      });
    }, 1000);

    return () => {
      if (gameLoop) clearInterval(gameLoop);
      clearInterval(spawner);
      clearInterval(timer);
    };
  }, [areaH, areaW, maxBubbles, difficulty, speedMult, endGame]);

  const timerColor = timeLeft <= 10 ? "#FF3B30" : timeLeft <= 20 ? "#FFD60A" : "#00E5FF";
  const diffLabel  = difficulty === "easy" ? "EASY" : difficulty === "medium" ? "MEDIUM" : difficulty === "hard" ? "HARD" : "EXTREME";
  const diffColor  = difficulty === "easy" ? "#30D158" : difficulty === "medium" ? "#FF9500" : difficulty === "hard" ? "#FF3B30" : "#FF2D78";

  return (
    <View style={styles.container}>
      {/* ── Background ── */}
      <LinearGradient
        colors={["#01010D", "#04041A", "#080628", "#0C0835"]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.3, y: 0 }}
        end={{ x: 0.7, y: 1 }}
      />
      {/* Nebula orbs */}
      <View style={styles.nebulaTR} />
      <View style={styles.nebulaBL} />
      {/* Star field */}
      {STARS.map((s, i) => (
        <View
          key={i}
          style={{
            position: "absolute",
            left: s.x,
            top: s.y,
            width: s.r * 2,
            height: s.r * 2,
            borderRadius: s.r,
            backgroundColor: `rgba(255,255,255,${s.o})`,
          }}
          pointerEvents="none"
        />
      ))}

      {/* ── Header ── */}
      <View style={[styles.header, { paddingTop: topPad + 8 }]}>
        <View style={[styles.statBadge, { borderColor: timeLeft <= 10 ? "rgba(255,59,48,0.4)" : "rgba(30,30,58,0.8)" }]}>
          <Text style={[styles.statLabel, { color: timerColor }]}>TIME</Text>
          <Text style={[styles.statValue, { color: timerColor }]}>{timeLeft}s</Text>
        </View>

        <View style={styles.centerBlock}>
          <View style={styles.scoreCenterBadge}>
            <Text style={styles.scoreCenterLabel}>SCORE</Text>
            <Text style={styles.scoreCenterValue}>{score}</Text>
          </View>
          <View style={[styles.diffBadge, { borderColor: diffColor + "66", backgroundColor: diffColor + "18" }]}>
            <Text style={[styles.diffText, { color: diffColor }]}>{diffLabel}</Text>
          </View>
        </View>

        <View style={styles.statBadge}>
          <Text style={styles.statLabel}>PLAYER</Text>
          <Text style={styles.playerNameText} numberOfLines={1}>{playerName}</Text>
        </View>
      </View>

      {/* ── Game area ── */}
      <View
        style={styles.gameArea}
        onLayout={(e) => {
          setAreaH(e.nativeEvent.layout.height);
          setAreaW(e.nativeEvent.layout.width);
        }}
      >
        {bubbles.map((bubble) => {
          const cfg = BUBBLE_CONFIGS[bubble.color];

          if (bubble.isExtreme) {
            // ── Extreme star: scale bloom + shadow glow ring ──
            const glowScale = bubble.entryAnim.interpolate({
              inputRange: [0, 0.5, 1],
              outputRange: [0.25, 1.08, 1.0],
            });
            const glowRingRadius = bubble.entryAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [4, 44],
            });
            const glowRingOpacity = bubble.entryAnim.interpolate({
              inputRange: [0, 0.3, 1],
              outputRange: [0, 0.9, 1],
            });
            return (
              <Animated.View
                key={bubble.id}
                pointerEvents="box-none"
                style={{
                  position: "absolute",
                  left: bubble.x - BS / 2,
                  top:  bubble.y - BS / 2,
                  width: BS,
                  height: BS,
                  opacity: bubble.entryAnim,
                  transform: [{ scale: glowScale }],
                }}
              >
                {/* Glow halo ring */}
                <Animated.View
                  style={{
                    position: "absolute",
                    top: -22, left: -22,
                    width: BS + 44, height: BS + 44,
                    borderRadius: (BS + 44) / 2,
                    backgroundColor: "transparent",
                    shadowColor: cfg.glow,
                    shadowOffset: { width: 0, height: 0 },
                    shadowRadius: glowRingRadius,
                    shadowOpacity: glowRingOpacity,
                  }}
                />
                <TouchableOpacity
                  style={[styles.bubble, styles.extremeBubble, { backgroundColor: cfg.hex, shadowColor: cfg.glow }]}
                  onPress={() => popBubble(bubble)}
                  activeOpacity={0.4}
                >
                  <View style={styles.bubbleOverlay} />
                  <View style={styles.bubbleHighlight} />
                  <View style={styles.bubbleInner} />
                </TouchableOpacity>
              </Animated.View>
            );
          }

          // ── Regular bubble ──
          return (
            <Animated.View
              key={bubble.id}
              pointerEvents="box-none"
              style={{
                position: "absolute",
                left: bubble.x - BS / 2,
                top:  bubble.y - BS / 2,
                width: BS,
                height: BS,
                opacity: bubble.entryAnim,
              }}
            >
              <TouchableOpacity
                style={[styles.bubble, { backgroundColor: cfg.hex, shadowColor: cfg.glow }]}
                onPress={() => popBubble(bubble)}
                activeOpacity={0.5}
              >
                <View style={styles.bubbleOverlay} />
                <View style={styles.bubbleHighlight} />
                <View style={styles.bubbleInner} />
              </TouchableOpacity>
            </Animated.View>
          );
        })}

        {floatingScores.map((fs) => {
          const translateY = fs.anim.interpolate({ inputRange: [0, 1], outputRange: [0, -65] });
          const opacity    = fs.anim.interpolate({ inputRange: [0, 0.7, 1], outputRange: [1, 1, 0] });
          const scale      = fs.anim.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0.5, 1.3, 1] });
          return (
            <Animated.Text
              key={fs.id}
              style={[
                styles.floatingScore,
                {
                  left: fs.x - 20,
                  top:  fs.y - BS / 2 - 10,
                  opacity,
                  transform: [{ translateY }, { scale }],
                },
              ]}
            >
              +{fs.points}
            </Animated.Text>
          );
        })}
      </View>

      {/* ── Game Over ── */}
      {isGameOver && (
        <View style={styles.overlay}>
          <View style={styles.gameOverCard}>
            <LinearGradient
              colors={["rgba(0,229,255,0.08)", "rgba(124,58,237,0.08)"]}
              style={[StyleSheet.absoluteFill, { borderRadius: 28 }]}
            />

            <Text style={styles.gameOverTitle}>GAME OVER</Text>
            <Text style={styles.gameOverName}>{playerName}</Text>

            {/* Score display */}
            <View style={styles.finalScoreContainer}>
              <Text style={styles.finalScoreLabel}>FINAL SCORE</Text>
              <Text style={styles.finalScoreValue}>{score}</Text>
            </View>

            <View style={styles.gameOverButtons}>
              <TouchableOpacity
                style={[styles.gameOverBtn, styles.menuBtn]}
                onPress={handleNavigateMenu}
              >
                <Text style={styles.menuBtnText}>MENU</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.gameOverBtn, styles.lbBtn]}
                onPress={handleNavigateLeaderboard}
              >
                <LinearGradient colors={["#00E5FF", "#0088CC"]} style={[StyleSheet.absoluteFill, { borderRadius: 14 }]} />
                <Text style={styles.lbBtnText}>LEADERBOARD</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingBottom: 10,
    zIndex: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(30,30,58,0.5)",
    backgroundColor: "rgba(7,7,24,0.88)",
    gap: 8,
  },
  statBadge: {
    backgroundColor: "rgba(18,18,42,0.9)",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 7,
    alignItems: "center",
    minWidth: 70,
    borderWidth: 1,
    borderColor: "rgba(30,30,58,0.8)",
  },
  statLabel: {
    color: "#6B6B9B",
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 1.5,
  },
  statValue: {
    color: "#00E5FF",
    fontSize: 20,
    fontWeight: "800",
    marginTop: 2,
  },
  playerNameText: {
    color: "#E8E8FF",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 2,
    maxWidth: 72,
  },

  centerBlock: {
    flex: 1,
    alignItems: "center",
    gap: 5,
  },
  scoreCenterBadge: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,229,255,0.07)",
    borderRadius: 14,
    paddingVertical: 5,
    paddingHorizontal: 18,
    borderWidth: 1,
    borderColor: "rgba(0,229,255,0.2)",
    width: "100%",
  },
  scoreCenterLabel: {
    color: "#00E5FF",
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 2,
  },
  scoreCenterValue: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "900",
    marginTop: 1,
  },
  diffBadge: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 3,
  },
  diffText: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 2,
  },

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

  gameArea: {
    flex: 1,
    overflow: "hidden",
  },

  bubble: {
    width: BS,
    height: BS,
    borderRadius: BS / 2,
    overflow: "hidden",
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    shadowOpacity: 0.55,
    elevation: 8,
    opacity: 0.88,
  },
  extremeBubble: {
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 18,
    shadowOpacity: 0.9,
    elevation: 16,
    opacity: 1,
  },
  bubbleOverlay: {
    position: "absolute",
    top: 0, left: 0, right: 0, bottom: 0,
    borderRadius: BS / 2,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  bubbleHighlight: {
    position: "absolute",
    top: 9, left: 13,
    width: BS * 0.38,
    height: BS * 0.26,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.48)",
    transform: [{ rotate: "-30deg" }],
  },
  bubbleInner: {
    position: "absolute",
    top: 0, left: 0, right: 0, bottom: 0,
    borderRadius: BS / 2,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.18)",
  },

  floatingScore: {
    position: "absolute",
    fontSize: 22,
    fontWeight: "800",
    color: "#FFD60A",
    textShadowColor: "rgba(255,214,10,0.6)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },

  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(7,7,24,0.92)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 100,
  },
  gameOverCard: {
    borderRadius: 28,
    padding: 32,
    alignItems: "center",
    width: "82%",
    borderWidth: 1,
    borderColor: "rgba(0,229,255,0.18)",
    overflow: "hidden",
    backgroundColor: "#10102A",
    shadowColor: "#00E5FF",
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 30,
    shadowOpacity: 0.3,
    elevation: 20,
  },
  gameOverTitle: {
    fontSize: 32,
    fontWeight: "900",
    color: "#00E5FF",
    letterSpacing: 4,
    textShadowColor: "rgba(0,229,255,0.5)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
  },
  gameOverName: {
    fontSize: 15,
    color: "#8080B0",
    fontWeight: "600",
    marginTop: 6,
    letterSpacing: 1,
  },
  finalScoreContainer: {
    alignItems: "center",
    marginVertical: 24,
    backgroundColor: "rgba(0,229,255,0.08)",
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(0,229,255,0.2)",
  },
  finalScoreLabel: {
    color: "#7070A0",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 2,
    marginBottom: 4,
  },
  finalScoreValue: {
    color: "#FFFFFF",
    fontSize: 52,
    fontWeight: "900",
    letterSpacing: -1,
  },
  gameOverButtons: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  gameOverBtn: {
    flex: 1,
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  menuBtn: {
    backgroundColor: "rgba(30,30,58,0.8)",
    borderWidth: 1,
    borderColor: "rgba(80,80,120,0.5)",
  },
  menuBtnText: {
    color: "#9090C0",
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 1,
  },
  lbBtn: {},
  lbBtnText: {
    color: "#000000",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1,
  },
});
