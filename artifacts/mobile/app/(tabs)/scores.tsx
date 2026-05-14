/**
 * scores.tsx — Leaderboard Screen
 *
 * Displays the global leaderboard fetched from Firestore, with:
 *   - Podium view (top 3 players with gold/silver/bronze styling)
 *   - Animated staggered list rows for ranks 4 and beyond
 *   - Current user's row highlighted in cyan with a ★ marker
 *   - Collapsible filter panel to narrow scores by difficulty/time/bubbles/speed
 *   - "CLEAR MINE" button to delete all of the logged-in user's score documents
 *
 * Filter behaviour:
 *   Selecting "Extreme" difficulty hides the Max Bubbles filter row because
 *   extreme mode has no bubble limit. All other filter combos work independently.
 *
 * State flow:
 *   loadScores(filter) → getHighScores(scoreFilter) → setScores() → animate rows
 *   handleFilterChange(f) → setFilter(f) + loadScores(f)
 *   handleClear() → clearUserScores(uid) + loadScores(filter)
 */

import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  FlatList,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import {
  clearUserScores,
  getHighScores,
  HighScore,
  ScoreFilter,
} from "@/utils/storage";

const { width: SW, height: SH } = Dimensions.get("window");

const MEDAL_COLORS = ["#FFD700", "#C0C0C0", "#CD7F32"];
const CROWN_CHARS  = ["👑", "🥈", "🥉"];

const TIME_OPTIONS    = [30, 60, 90, 120, 180];
const BUBBLE_OPTIONS  = [5, 10, 15, 20, 30];
const SPEED_OPTIONS   = [1, 2, 3];
const DIFF_OPTIONS    = ["easy", "medium", "hard", "extreme"] as const;

const DIFF_COLORS: Record<string, string> = {
  easy: "#30D158", medium: "#FF9500", hard: "#FF3B30", extreme: "#FF2D78",
};

const STARS = Array.from({ length: 70 }, () => ({
  x: Math.random() * SW,
  y: Math.random() * SH,
  r: Math.random() < 0.25 ? 1.8 : Math.random() < 0.55 ? 1.2 : 0.7,
  o: Math.random() * 0.5 + 0.15,
}));

const AVATAR_PALETTE = [
  "#00E5FF", "#9B5DE5", "#0A84FF", "#30D158",
  "#FF9500", "#FF3B30", "#FFD60A", "#BF5AF2",
];

function avatarColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffff;
  return AVATAR_PALETTE[h % AVATAR_PALETTE.length];
}
function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return parts.length >= 2
    ? (parts[0][0] + parts[1][0]).toUpperCase()
    : name.slice(0, 2).toUpperCase();
}

// ─── VortexLogo ─────────────────────────────────────────────────────────────
function VortexLogo({ size = 100 }: { size?: number }) {
  const spinAnim  = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(spinAnim, { toValue: 1, duration: 7000, easing: Easing.linear, useNativeDriver: false })
    ).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.06, duration: 2200, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
        Animated.timing(pulseAnim, { toValue: 1,    duration: 2200, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
      ])
    ).start();
  }, []);

  const spin = spinAnim.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });
  const s = size, rW = s * 0.9, rH = s * 0.3, rBR = s * 0.15;
  const rBW = Math.max(1.5, s * 0.026), rL = (s - rW) / 2, rT = (s - rH) / 2;
  const dot = Math.max(4, s * 0.1);

  return (
    <Animated.View style={{
      width: s, height: s, borderRadius: s / 2,
      alignItems: "center", justifyContent: "center",
      transform: [{ scale: pulseAnim }],
      shadowColor: "#00E5FF", shadowOffset: { width: 0, height: 0 },
      shadowRadius: s * 0.38, shadowOpacity: 0.9, elevation: 22,
    }}>
      <View style={{ position: "absolute", width: s * 0.74, height: s * 0.74,
        borderRadius: s * 0.37, backgroundColor: "#02021A", top: s * 0.13, left: s * 0.13 }} />
      <Animated.View style={{ position: "absolute", width: s, height: s, transform: [{ rotate: spin }] }}>
        {[
          { color: "#00E5FF", rot: "0deg",   op: 0.9  },
          { color: "#9B5DE5", rot: "60deg",  op: 0.85 },
          { color: "#0A84FF", rot: "-60deg", op: 0.85 },
        ].map(({ color, rot, op }) => (
          <View key={rot} style={{
            position: "absolute", width: rW, height: rH, borderRadius: rBR,
            borderWidth: rBW, borderColor: color, backgroundColor: "transparent",
            left: rL, top: rT, opacity: op, transform: [{ rotate: rot }],
          }} />
        ))}
      </Animated.View>
      <Text style={{
        position: "absolute", color: "#00E5FF", fontSize: s * 0.44, fontWeight: "900",
        letterSpacing: -1, textShadowColor: "#00E5FF",
        textShadowOffset: { width: 0, height: 0 }, textShadowRadius: s * 0.15,
        top: s * 0.21, left: 0, right: 0, textAlign: "center",
      }}>V</Text>
      <View style={{
        position: "absolute", width: dot, height: dot, borderRadius: dot / 2,
        backgroundColor: "#FFFFFF", top: s * 0.555 - dot / 2, left: s / 2 - dot / 2,
        shadowColor: "#00E5FF", shadowOffset: { width: 0, height: 0 }, shadowRadius: 6, shadowOpacity: 1,
      }} />
      <View style={{
        position: "absolute", width: s, height: s, borderRadius: s / 2,
        borderWidth: 1, borderColor: "rgba(0,229,255,0.28)",
      }} />
    </Animated.View>
  );
}

// ─── Podium Card ─────────────────────────────────────────────────────────────
function PodiumCard({ item, rank, isMe }: { item: HighScore; rank: number; isMe: boolean }) {
  const mc = MEDAL_COLORS[rank];
  const ac = avatarColor(item.playerName);
  return (
    <View style={[podStyles.card, { borderColor: mc + "55" }, isMe && podStyles.cardMe]}>
      <LinearGradient colors={[mc + "18", mc + "06"]} style={[StyleSheet.absoluteFill, { borderRadius: 20 }]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
      <View style={podStyles.shine} />
      <Text style={podStyles.crown}>{CROWN_CHARS[rank]}</Text>
      <View style={[podStyles.avatar, { backgroundColor: ac + "33", borderColor: ac + "88" }]}>
        <Text style={[podStyles.avatarTxt, { color: ac }]}>{initials(item.playerName)}</Text>
        {isMe && <View style={[podStyles.meRing, { borderColor: "#00E5FF" }]} />}
      </View>
      <Text style={podStyles.name} numberOfLines={1}>{item.playerName}</Text>
      <View style={[podStyles.scoreBadge, { backgroundColor: mc + "22", borderColor: mc + "66" }]}>
        <Text style={[podStyles.scoreVal, { color: mc }]}>{item.score}</Text>
        <Text style={[podStyles.scoreLbl, { color: mc + "99" }]}>PTS</Text>
      </View>
      <Text style={podStyles.date}>{item.date}</Text>
    </View>
  );
}

const podStyles = StyleSheet.create({
  card: {
    flex: 1, alignItems: "center", borderRadius: 20, borderWidth: 1,
    paddingVertical: 14, paddingHorizontal: 6, overflow: "hidden", gap: 5,
    minHeight: 160, backgroundColor: "rgba(14,14,36,0.85)",
  },
  cardMe: {
    borderColor: "#00E5FF88",
    shadowColor: "#00E5FF", shadowOffset: { width: 0, height: 0 },
    shadowRadius: 12, shadowOpacity: 0.5, elevation: 8,
  },
  shine: { position: "absolute", top: 0, left: "20%", width: "60%", height: 2,
    backgroundColor: "rgba(255,255,255,0.15)", borderBottomLeftRadius: 4, borderBottomRightRadius: 4 },
  crown: { fontSize: 20, marginBottom: -2 },
  avatar: { width: 44, height: 44, borderRadius: 22, borderWidth: 2, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  avatarTxt: { fontSize: 15, fontWeight: "800" },
  meRing: { position: "absolute", width: 48, height: 48, borderRadius: 24, borderWidth: 2, opacity: 0.6 },
  name: { color: "#E0E0FF", fontSize: 11, fontWeight: "700", letterSpacing: 0.3, textAlign: "center", width: "100%" },
  scoreBadge: { borderRadius: 10, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 3, alignItems: "center" },
  scoreVal: { fontSize: 19, fontWeight: "900" },
  scoreLbl: { fontSize: 9, fontWeight: "700", letterSpacing: 1, marginTop: -2 },
  date: { color: "#4A4A7A", fontSize: 10 },
});

// ─── Row Item ─────────────────────────────────────────────────────────────────
function ScoreRow({ item, index, isMe, anim }: {
  item: HighScore; index: number; isMe: boolean; anim: Animated.Value;
}) {
  const ac = avatarColor(item.playerName);
  return (
    <Animated.View style={{
      opacity: anim,
      transform: [{ translateX: anim.interpolate({ inputRange: [0, 1], outputRange: [40, 0] }) }],
    }}>
      <View style={[rowStyles.row, isMe && rowStyles.rowMe]}>
        {isMe && <View style={rowStyles.meLine} />}
        <View style={rowStyles.rankWrap}>
          <Text style={rowStyles.rankNum}>#{index + 1}</Text>
        </View>
        <View style={[rowStyles.avatar, { backgroundColor: ac + "28", borderColor: ac + (isMe ? "CC" : "66") }]}>
          <Text style={[rowStyles.avatarTxt, { color: isMe ? "#00E5FF" : ac }]}>{initials(item.playerName)}</Text>
        </View>
        <View style={rowStyles.info}>
          <Text style={[rowStyles.name, isMe && rowStyles.nameMe]} numberOfLines={1}>
            {item.playerName}{isMe ? "  ★" : ""}
          </Text>
          <Text style={rowStyles.date}>{item.date}</Text>
        </View>
        <View style={rowStyles.scoreWrap}>
          <Text style={[rowStyles.scoreVal, isMe && rowStyles.scoreValMe]}>{item.score}</Text>
          <Text style={rowStyles.scoreLbl}>pts</Text>
        </View>
      </View>
    </Animated.View>
  );
}

const rowStyles = StyleSheet.create({
  row: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "rgba(14,14,36,0.75)", borderRadius: 16,
    paddingVertical: 11, paddingHorizontal: 14,
    borderWidth: 1, borderColor: "rgba(30,30,60,0.8)", gap: 11, overflow: "hidden",
  },
  rowMe: { borderColor: "rgba(0,229,255,0.35)", backgroundColor: "rgba(0,229,255,0.05)" },
  meLine: {
    position: "absolute", left: 0, top: 0, bottom: 0, width: 3,
    backgroundColor: "#00E5FF", borderTopLeftRadius: 16, borderBottomLeftRadius: 16, opacity: 0.8,
  },
  rankWrap: { width: 34, alignItems: "center" },
  rankNum: { color: "#4A4A7A", fontSize: 13, fontWeight: "700" },
  avatar: { width: 38, height: 38, borderRadius: 19, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  avatarTxt: { fontSize: 13, fontWeight: "800" },
  info: { flex: 1 },
  name: { color: "#CCCCEE", fontSize: 15, fontWeight: "700" },
  nameMe: { color: "#00E5FF" },
  date: { color: "#4A4A7A", fontSize: 11, marginTop: 2 },
  scoreWrap: { alignItems: "flex-end" },
  scoreVal: { color: "#7A7ABA", fontSize: 22, fontWeight: "900" },
  scoreValMe: { color: "#00E5FF" },
  scoreLbl: { color: "#4A4A7A", fontSize: 10, fontWeight: "600", marginTop: -2 },
});

// ─── Filter Panel ─────────────────────────────────────────────────────────────
type DiffOption = typeof DIFF_OPTIONS[number] | "any";

interface FilterState {
  difficulty: DiffOption;
  timeLimit: number | "any";
  maxBubbles: number | "any";
  speed: number | "any";
}

const DEFAULT_FILTER: FilterState = {
  difficulty: "any", timeLimit: "any", maxBubbles: "any", speed: "any",
};

function buildScoreFilter(f: FilterState): ScoreFilter | undefined {
  const out: ScoreFilter = {};
  let active = false;
  if (f.difficulty !== "any") { out.difficulty = f.difficulty; active = true; }
  if (f.timeLimit !== "any")  { out.timeLimit  = f.timeLimit as number; active = true; }
  if (f.speed !== "any")      { out.speed      = f.speed as number; active = true; }
  if (f.maxBubbles !== "any" && f.difficulty !== "extreme") {
    out.maxBubbles = f.maxBubbles as number; active = true;
  }
  return active ? out : undefined;
}

function isFilterActive(f: FilterState) {
  return f.difficulty !== "any" || f.timeLimit !== "any" || f.maxBubbles !== "any" || f.speed !== "any";
}

function filterSummary(f: FilterState): string {
  const parts: string[] = [];
  if (f.difficulty !== "any") parts.push(f.difficulty.charAt(0).toUpperCase() + f.difficulty.slice(1));
  if (f.timeLimit !== "any")  parts.push(`${f.timeLimit}s`);
  if (f.maxBubbles !== "any" && f.difficulty !== "extreme") parts.push(`${f.maxBubbles} bubbles`);
  if (f.speed !== "any")      parts.push(`${f.speed}× speed`);
  return parts.length ? parts.join("  •  ") : "All scores";
}

function Pill({ label, active, color, onPress }: {
  label: string; active: boolean; color?: string; onPress: () => void;
}) {
  const c = color ?? "#00E5FF";
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        pillStyles.pill,
        active && { backgroundColor: c + "22", borderColor: c + "AA" },
      ]}
      activeOpacity={0.75}
    >
      <Text style={[pillStyles.txt, active && { color: c }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const pillStyles = StyleSheet.create({
  pill: {
    paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20,
    borderWidth: 1, borderColor: "rgba(40,40,80,0.8)",
    backgroundColor: "rgba(14,14,36,0.6)",
  },
  txt: { color: "#4A4A7A", fontSize: 12, fontWeight: "700" },
});

function FilterPanel({ filter, onChange }: {
  filter: FilterState;
  onChange: (f: FilterState) => void;
}) {
  const [open, setOpen] = useState(false);
  const heightAnim = useRef(new Animated.Value(0)).current;
  const active = isFilterActive(filter);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    Animated.timing(heightAnim, {
      toValue: next ? 1 : 0,
      duration: 260,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  };

  const set = (patch: Partial<FilterState>) => onChange({ ...filter, ...patch });

  return (
    <View style={fpStyles.wrap}>
      {/* Summary row / toggle */}
      <TouchableOpacity style={fpStyles.bar} onPress={toggle} activeOpacity={0.8}>
        <View style={fpStyles.barLeft}>
          <Text style={fpStyles.barLabel}>FILTER</Text>
          {active && <View style={fpStyles.activeDot} />}
        </View>
        <Text style={fpStyles.barSummary} numberOfLines={1}>{filterSummary(filter)}</Text>
        <Text style={fpStyles.chevron}>{open ? "▲" : "▼"}</Text>
      </TouchableOpacity>

      {/* Expanded rows */}
      <Animated.View style={[fpStyles.body, {
        maxHeight: heightAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 300] }),
        opacity: heightAnim,
      }]}>
        <View style={fpStyles.row}>
          <Text style={fpStyles.rowLabel}>DIFFICULTY</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={fpStyles.pills}>
            <Pill label="Any" active={filter.difficulty === "any"} color="#6B6B9B"
              onPress={() => set({ difficulty: "any", maxBubbles: "any" })} />
            {DIFF_OPTIONS.map((d) => (
              <Pill key={d} label={d.charAt(0).toUpperCase() + d.slice(1)}
                active={filter.difficulty === d} color={DIFF_COLORS[d]}
                onPress={() => set({
                  difficulty: d,
                  maxBubbles: d === "extreme" ? "any" : filter.maxBubbles,
                })} />
            ))}
          </ScrollView>
        </View>

        <View style={fpStyles.row}>
          <Text style={fpStyles.rowLabel}>GAME TIME</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={fpStyles.pills}>
            <Pill label="Any" active={filter.timeLimit === "any"} color="#6B6B9B"
              onPress={() => set({ timeLimit: "any" })} />
            {TIME_OPTIONS.map((t) => (
              <Pill key={t} label={`${t}s`} active={filter.timeLimit === t} color="#00E5FF"
                onPress={() => set({ timeLimit: t })} />
            ))}
          </ScrollView>
        </View>

        {filter.difficulty !== "extreme" && (
          <View style={fpStyles.row}>
            <Text style={fpStyles.rowLabel}>MAX BUBBLES</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={fpStyles.pills}>
              <Pill label="Any" active={filter.maxBubbles === "any"} color="#6B6B9B"
                onPress={() => set({ maxBubbles: "any" })} />
              {BUBBLE_OPTIONS.map((b) => (
                <Pill key={b} label={String(b)} active={filter.maxBubbles === b} color="#9B5DE5"
                  onPress={() => set({ maxBubbles: b })} />
              ))}
            </ScrollView>
          </View>
        )}

        <View style={[fpStyles.row, { borderBottomWidth: 0 }]}>
          <Text style={fpStyles.rowLabel}>SPEED</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={fpStyles.pills}>
            <Pill label="Any" active={filter.speed === "any"} color="#6B6B9B"
              onPress={() => set({ speed: "any" })} />
            {SPEED_OPTIONS.map((s) => (
              <Pill key={s} label={`${s}×`} active={filter.speed === s} color="#FF9500"
                onPress={() => set({ speed: s })} />
            ))}
          </ScrollView>
        </View>

        {active && (
          <TouchableOpacity onPress={() => onChange(DEFAULT_FILTER)} style={fpStyles.resetBtn} activeOpacity={0.75}>
            <Text style={fpStyles.resetTxt}>RESET FILTERS</Text>
          </TouchableOpacity>
        )}
      </Animated.View>
    </View>
  );
}

const fpStyles = StyleSheet.create({
  wrap: {
    backgroundColor: "rgba(8,8,24,0.9)",
    borderBottomWidth: 1, borderBottomColor: "rgba(30,30,60,0.6)",
  },
  bar: {
    flexDirection: "row", alignItems: "center", paddingHorizontal: 16,
    paddingVertical: 10, gap: 8,
  },
  barLeft: { flexDirection: "row", alignItems: "center", gap: 6 },
  barLabel: { color: "#4A4A7A", fontSize: 10, fontWeight: "800", letterSpacing: 2 },
  activeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#00E5FF" },
  barSummary: { flex: 1, color: "#8888BB", fontSize: 11, fontWeight: "600" },
  chevron: { color: "#4A4A7A", fontSize: 10, fontWeight: "700" },
  body: { overflow: "hidden" },
  row: {
    paddingHorizontal: 14, paddingBottom: 10,
    borderBottomWidth: 1, borderBottomColor: "rgba(20,20,50,0.5)",
    marginBottom: 2,
  },
  rowLabel: { color: "#4A4A7A", fontSize: 9, fontWeight: "800", letterSpacing: 2, marginBottom: 6, marginTop: 8 },
  pills: { flexDirection: "row", gap: 6 },
  resetBtn: {
    marginHorizontal: 14, marginBottom: 12, marginTop: 2,
    paddingVertical: 7, borderRadius: 10, borderWidth: 1,
    borderColor: "rgba(255,59,48,0.3)", backgroundColor: "rgba(255,59,48,0.08)",
    alignItems: "center",
  },
  resetTxt: { color: "#FF3B30", fontSize: 11, fontWeight: "800", letterSpacing: 1 },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function ScoresScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [scores, setScores]     = useState<HighScore[]>([]);
  const [loading, setLoading]   = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [filter, setFilter]     = useState<FilterState>(DEFAULT_FILTER);
  const rowAnims = useRef<Animated.Value[]>([]).current;

  const topPad = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;
  const botPad = Platform.OS === "web" ? Math.max(insets.bottom, 34) : insets.bottom || 16;

  const loadScores = async (f: FilterState) => {
    setLoading(true);
    setLoadError(false);
    const scoreFilter = buildScoreFilter(f);
    let data: HighScore[] = [];
    try {
      data = await getHighScores(scoreFilter);
      setScores(data);
    } catch {
      setLoadError(true);
      setScores([]);
    }
    setLoading(false);

    // Staggered entrance for rest items (index 3+)
    const restCount = Math.max(0, data.length - 3);
    while (rowAnims.length < restCount) rowAnims.push(new Animated.Value(0));
    rowAnims.forEach((a) => a.setValue(0));
    Animated.parallel(
      rowAnims.slice(0, restCount).map((a, i) =>
        Animated.timing(a, {
          toValue: 1, duration: 300, delay: i * 50,
          easing: Easing.out(Easing.cubic), useNativeDriver: false,
        })
      )
    ).start();
  };

  useEffect(() => { loadScores(filter); }, []);

  const handleFilterChange = (f: FilterState) => {
    setFilter(f);
    loadScores(f);
  };

  const handleClear = async () => {
    if (!user) return;
    await clearUserScores(user.uid);
    rowAnims.forEach((a) => a.setValue(0));
    loadScores(filter);
  };

  const top3 = scores.slice(0, 3);
  const rest = scores.slice(3);

  const ListHeader = () => (
    <>
      {top3.length > 0 && (
        <View style={s.podiumSection}>
          <Text style={s.sectionLabel}>TOP PLAYERS</Text>
          <View style={s.podiumRow}>
            {top3.map((item, i) => (
              <PodiumCard key={item.id} item={item} rank={i} isMe={user?.uid === item.userId} />
            ))}
          </View>
        </View>
      )}
      {rest.length > 0 && (
        <Text style={[s.sectionLabel, { marginTop: 18, marginBottom: 8 }]}>RANKINGS</Text>
      )}
    </>
  );

  return (
    <View style={s.container}>
      {/* Background */}
      <LinearGradient colors={["#01010D", "#04041A", "#080628", "#0C0835"]}
        style={StyleSheet.absoluteFill} start={{ x: 0.3, y: 0 }} end={{ x: 0.7, y: 1 }} />
      <View style={s.nebulaTR} /><View style={s.nebulaBL} />
      {STARS.map((st, i) => (
        <View key={i} style={{
          position: "absolute", left: st.x, top: st.y,
          width: st.r * 2, height: st.r * 2, borderRadius: st.r,
          backgroundColor: "#FFFFFF", opacity: st.o,
        }} />
      ))}

      {/* Header */}
      <View style={[s.header, { paddingTop: topPad + 10 }]}>
        <TouchableOpacity onPress={() => router.replace(user ? "/(tabs)" : { pathname: "/(tabs)" as never, params: { guest: "1" } })} style={s.backBtn}>
          <Text style={s.backText}>← BACK</Text>
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <VortexLogo size={40} />
          <View>
            <Text style={s.headerBrand}>VORTREXYN</Text>
            <Text style={s.headerTitle}>LEADERBOARD</Text>
          </View>
        </View>
        {user ? (
          <TouchableOpacity onPress={handleClear} style={s.clearBtn}>
            <Text style={s.clearText}>CLEAR{"\n"}MINE</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 52 }} />
        )}
      </View>

      {/* Guest notice */}
      {!user && (
        <View style={s.guestBanner}>
          <Text style={s.guestBannerText}>No saved scores — playing as Guest</Text>
          <TouchableOpacity onPress={() => router.replace("/(tabs)/login")} activeOpacity={0.8}>
            <Text style={s.guestBannerLink}>Sign in to save future scores →</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Filter panel */}
      <FilterPanel filter={filter} onChange={handleFilterChange} />

      {/* Content */}
      {loading ? (
        <View style={s.centered}>
          <VortexLogo size={72} />
          <Text style={s.loadingText}>Loading scores…</Text>
        </View>
      ) : loadError ? (
        <View style={s.centered}>
          <Text style={{ fontSize: 36, marginBottom: 8 }}>🔒</Text>
          <Text style={s.emptyTitle}>Permissions Error</Text>
          <Text style={s.emptyText}>
            Firebase security rules need updating.{"\n"}See the instructions below.
          </Text>
          <TouchableOpacity
            style={[s.playNowBtn, { backgroundColor: "rgba(0,229,255,0.12)", borderWidth: 1, borderColor: "rgba(0,229,255,0.3)" }]}
            onPress={() => loadScores(filter)} activeOpacity={0.8}
          >
            <Text style={[s.playNowText, { color: "#00E5FF" }]}>RETRY</Text>
          </TouchableOpacity>
        </View>
      ) : scores.length === 0 ? (
        <View style={s.centered}>
          <VortexLogo size={88} />
          <Text style={s.emptyTitle}>
            {isFilterActive(filter) ? "No Scores Match" : "No Scores Yet"}
          </Text>
          <Text style={s.emptyText}>
            {isFilterActive(filter)
              ? "Try different filter settings."
              : "Play a game to top the charts!"}
          </Text>
          {!isFilterActive(filter) && (
            <TouchableOpacity style={s.playNowBtn} onPress={() => router.replace(user ? "/(tabs)" : { pathname: "/(tabs)" as never, params: { guest: "1" } })} activeOpacity={0.8}>
              <LinearGradient colors={["#00E5FF", "#0066CC"]} style={[StyleSheet.absoluteFill, { borderRadius: 14 }]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
              <Text style={s.playNowText}>PLAY NOW</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={rest}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={<ListHeader />}
          renderItem={({ item, index }) => (
            <ScoreRow item={item} index={index + 3} isMe={user?.uid === item.userId}
              anim={rowAnims[index] ?? new Animated.Value(1)} />
          )}
          contentContainerStyle={[s.listContent, { paddingBottom: botPad + 24 }]}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  nebulaTR: {
    position: "absolute", top: -90, right: -70, width: 280, height: 280, borderRadius: 140,
    backgroundColor: "rgba(124,58,237,0.13)",
    shadowColor: "#7C3AED", shadowOffset: { width: 0, height: 0 }, shadowRadius: 90, shadowOpacity: 0.55,
  },
  nebulaBL: {
    position: "absolute", bottom: -70, left: -70, width: 240, height: 240, borderRadius: 120,
    backgroundColor: "rgba(0,229,255,0.09)",
    shadowColor: "#00E5FF", shadowOffset: { width: 0, height: 0 }, shadowRadius: 70, shadowOpacity: 0.4,
  },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1,
    borderBottomColor: "rgba(30,30,60,0.6)", backgroundColor: "rgba(1,1,13,0.75)",
  },
  headerCenter: { flexDirection: "row", alignItems: "center", gap: 10 },
  headerBrand: { fontSize: 9, fontWeight: "800", color: "#00E5FF", letterSpacing: 4, marginBottom: 1 },
  headerTitle: {
    fontSize: 17, fontWeight: "900", color: "#FFFFFF", letterSpacing: 2,
    textShadowColor: "rgba(0,229,255,0.3)", textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 8,
  },
  backBtn: { paddingVertical: 8, paddingHorizontal: 2, minWidth: 52 },
  backText: { color: "#6B6B9B", fontSize: 12, fontWeight: "700", letterSpacing: 1 },
  clearBtn: {
    paddingVertical: 6, paddingHorizontal: 10, borderRadius: 10, borderWidth: 1,
    borderColor: "rgba(255,59,48,0.3)", backgroundColor: "rgba(255,59,48,0.08)",
    minWidth: 52, alignItems: "center",
  },
  clearText: { color: "#FF3B30", fontSize: 9, fontWeight: "800", letterSpacing: 0.8, textAlign: "center", lineHeight: 14 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16 },
  loadingText: { color: "#6B6B9B", fontSize: 14, fontWeight: "600", letterSpacing: 1 },
  emptyTitle: { color: "#E0E0FF", fontSize: 22, fontWeight: "700" },
  emptyText: { color: "#6B6B9B", fontSize: 14, textAlign: "center", paddingHorizontal: 40 },
  statsStrip: {
    flexDirection: "row",
    backgroundColor: "rgba(155,93,229,0.08)",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(155,93,229,0.2)",
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  statItem: { flex: 1, alignItems: "center" },
  statValue: { color: "#E0E0FF", fontSize: 18, fontWeight: "900", letterSpacing: 0.5 },
  statLabel: { color: "#6B6B9B", fontSize: 9, fontWeight: "800", letterSpacing: 2, marginTop: 1 },
  statDivider: { width: 1, height: 28, backgroundColor: "rgba(155,93,229,0.3)" },
  guestBanner: {
    paddingVertical: 10, paddingHorizontal: 16,
    backgroundColor: "rgba(0,229,255,0.07)",
    borderBottomWidth: 1, borderBottomColor: "rgba(0,229,255,0.15)",
    alignItems: "center", gap: 4,
  },
  guestBannerText: { color: "#8888BB", fontSize: 12, fontWeight: "600" },
  guestBannerLink: { color: "#00E5FF", fontSize: 12, fontWeight: "700" },
  playNowBtn: {
    marginTop: 8, height: 48, paddingHorizontal: 32, borderRadius: 14,
    justifyContent: "center", alignItems: "center", overflow: "hidden",
  },
  playNowText: { color: "#FFFFFF", fontSize: 14, fontWeight: "900", letterSpacing: 2 },
  listContent: { paddingHorizontal: 14, paddingTop: 14 },
  podiumSection: { marginBottom: 4 },
  sectionLabel: { color: "#4A4A7A", fontSize: 10, fontWeight: "800", letterSpacing: 3, marginBottom: 12 },
  podiumRow: { flexDirection: "row", gap: 8 },
});
