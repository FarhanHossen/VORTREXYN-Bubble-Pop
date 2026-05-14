/**
 * sync-history.tsx — GitHub Sync History Screen
 *
 * Shows a running log of every GitHub sync event recorded in the database.
 * Each row shows: timestamp, status badge (pushed/skipped/failed),
 * files changed, duration, and a link to the commit on GitHub.
 *
 * Data is fetched from GET /api/sync-log via the shared reverse proxy
 * using EXPO_PUBLIC_DOMAIN (the Replit dev domain) as the base URL.
 */

import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Linking,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width: SW, height: SH } = Dimensions.get("window");

const STARS = Array.from({ length: 50 }, () => ({
  x: Math.random() * SW,
  y: Math.random() * SH,
  r: Math.random() < 0.25 ? 1.8 : Math.random() < 0.55 ? 1.2 : 0.7,
  o: Math.random() * 0.5 + 0.15,
}));

interface SyncLogEntry {
  id: number;
  status: "pushed" | "skipped" | "failed";
  added_modified: number;
  deleted: number;
  reused: number;
  duration_ms: number;
  commit_sha: string | null;
  commit_message: string | null;
  repo: string | null;
  branch: string | null;
  error_message: string | null;
  synced_at: string;
}

function getApiBase(): string {
  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  if (domain) return `https://${domain}`;
  return "";
}

async function fetchSyncLogs(): Promise<SyncLogEntry[]> {
  const base = getApiBase();
  const res = await fetch(`${base}/api/sync-log?limit=100`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

const STATUS_CONFIG = {
  pushed: { label: "PUSHED", color: "#30D158", bg: "rgba(48,209,88,0.15)" },
  skipped: { label: "SKIPPED", color: "#8E8E93", bg: "rgba(142,142,147,0.15)" },
  failed: { label: "FAILED", color: "#FF3B30", bg: "rgba(255,59,48,0.15)" },
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function SyncRow({ item }: { item: SyncLogEntry }) {
  const cfg = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.failed;
  const shortSha = item.commit_sha ? item.commit_sha.slice(0, 7) : null;
  const commitUrl =
    item.repo && item.commit_sha
      ? `https://github.com/${item.repo}/commit/${item.commit_sha}`
      : null;

  const openCommit = () => {
    if (commitUrl) Linking.openURL(commitUrl);
  };

  return (
    <View style={rowStyles.row}>
      <View style={rowStyles.topLine}>
        <View style={[rowStyles.badge, { backgroundColor: cfg.bg, borderColor: cfg.color + "55" }]}>
          <Text style={[rowStyles.badgeText, { color: cfg.color }]}>{cfg.label}</Text>
        </View>
        <Text style={rowStyles.date}>{formatDate(item.synced_at)}</Text>
        <Text style={rowStyles.duration}>{formatDuration(item.duration_ms)}</Text>
      </View>

      {item.status === "pushed" && (
        <View style={rowStyles.statsLine}>
          <Text style={rowStyles.statItem}>
            <Text style={rowStyles.statNum}>{item.added_modified}</Text>
            <Text style={rowStyles.statLabel}> added/modified</Text>
          </Text>
          <Text style={rowStyles.sep}>·</Text>
          <Text style={rowStyles.statItem}>
            <Text style={rowStyles.statNum}>{item.deleted}</Text>
            <Text style={rowStyles.statLabel}> deleted</Text>
          </Text>
          <Text style={rowStyles.sep}>·</Text>
          <Text style={rowStyles.statItem}>
            <Text style={rowStyles.statNum}>{item.reused}</Text>
            <Text style={rowStyles.statLabel}> unchanged</Text>
          </Text>
        </View>
      )}

      {item.status === "failed" && item.error_message && (
        <Text style={rowStyles.error} numberOfLines={2}>
          {item.error_message}
        </Text>
      )}

      {shortSha && commitUrl && (
        <TouchableOpacity onPress={openCommit} activeOpacity={0.7} style={rowStyles.commitRow}>
          <Text style={rowStyles.commitSha}>{shortSha}</Text>
          {item.branch && <Text style={rowStyles.branch}> on {item.branch}</Text>}
          <Text style={rowStyles.commitArrow}> ↗</Text>
        </TouchableOpacity>
      )}

      {item.status === "skipped" && (
        <Text style={rowStyles.skippedNote}>No changes detected</Text>
      )}
    </View>
  );
}

const rowStyles = StyleSheet.create({
  row: {
    backgroundColor: "rgba(14,14,36,0.82)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(30,30,60,0.8)",
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 6,
    marginBottom: 10,
  },
  topLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  badge: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
  },
  date: {
    flex: 1,
    color: "#6666AA",
    fontSize: 12,
    fontWeight: "600",
  },
  duration: {
    color: "#4A4A7A",
    fontSize: 11,
    fontWeight: "600",
  },
  statsLine: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 4,
  },
  statItem: {},
  statNum: {
    color: "#CCCCEE",
    fontSize: 13,
    fontWeight: "700",
  },
  statLabel: {
    color: "#4A4A7A",
    fontSize: 12,
  },
  sep: {
    color: "#333366",
    fontSize: 12,
    marginHorizontal: 2,
  },
  error: {
    color: "#FF6B60",
    fontSize: 12,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    backgroundColor: "rgba(255,59,48,0.08)",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  commitRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  commitSha: {
    color: "#00E5FF",
    fontSize: 12,
    fontWeight: "700",
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
  branch: {
    color: "#4A4A7A",
    fontSize: 12,
  },
  commitArrow: {
    color: "#00E5FF",
    fontSize: 12,
  },
  skippedNote: {
    color: "#4A4A7A",
    fontSize: 12,
  },
});

function EmptyState({ error }: { error: boolean }) {
  return (
    <View style={emptyStyles.wrap}>
      <Text style={emptyStyles.icon}>{error ? "⚠️" : "📭"}</Text>
      <Text style={emptyStyles.title}>
        {error ? "Could not load history" : "No syncs recorded yet"}
      </Text>
      <Text style={emptyStyles.sub}>
        {error
          ? "Make sure the API server is running."
          : "Sync history will appear here after the first GitHub push."}
      </Text>
    </View>
  );
}

const emptyStyles = StyleSheet.create({
  wrap: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32, gap: 12 },
  icon: { fontSize: 40 },
  title: { color: "#CCCCEE", fontSize: 16, fontWeight: "700", textAlign: "center" },
  sub: { color: "#4A4A7A", fontSize: 13, textAlign: "center", lineHeight: 18 },
});

export default function SyncHistoryScreen() {
  const insets = useSafeAreaInsets();
  const [entries, setEntries] = useState<SyncLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const topPad = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;
  const botPad = Platform.OS === "web" ? Math.max(insets.bottom, 34) : insets.bottom || 16;

  const load = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    setError(false);
    try {
      const data = await fetchSyncLogs();
      setEntries(data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    load(true);
  };

  const pushedCount = entries.filter((e) => e.status === "pushed").length;
  const failedCount = entries.filter((e) => e.status === "failed").length;

  return (
    <View style={s.container}>
      <LinearGradient
        colors={["#01010D", "#04041A", "#080628", "#0C0835"]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.3, y: 0 }}
        end={{ x: 0.7, y: 1 }}
      />
      <View style={s.nebulaTR} />
      <View style={s.nebulaBL} />
      {STARS.map((st, i) => (
        <View
          key={i}
          style={{
            position: "absolute",
            left: st.x,
            top: st.y,
            width: st.r * 2,
            height: st.r * 2,
            borderRadius: st.r,
            backgroundColor: "#FFFFFF",
            opacity: st.o,
          }}
        />
      ))}

      {/* Header */}
      <View style={[s.header, { paddingTop: topPad + 10 }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Text style={s.backText}>← BACK</Text>
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={s.headerBrand}>VORTREXYN</Text>
          <Text style={s.headerTitle}>SYNC HISTORY</Text>
        </View>
        <View style={{ width: 52 }} />
      </View>

      {/* Stats bar */}
      {entries.length > 0 && (
        <View style={s.statsBar}>
          <View style={s.statChip}>
            <Text style={s.statNum}>{entries.length}</Text>
            <Text style={s.statLbl}>TOTAL</Text>
          </View>
          <View style={[s.statChip, { borderColor: "rgba(48,209,88,0.3)" }]}>
            <Text style={[s.statNum, { color: "#30D158" }]}>{pushedCount}</Text>
            <Text style={s.statLbl}>PUSHED</Text>
          </View>
          {failedCount > 0 && (
            <View style={[s.statChip, { borderColor: "rgba(255,59,48,0.3)" }]}>
              <Text style={[s.statNum, { color: "#FF3B30" }]}>{failedCount}</Text>
              <Text style={s.statLbl}>FAILED</Text>
            </View>
          )}
        </View>
      )}

      {/* List */}
      {loading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color="#00E5FF" />
        </View>
      ) : (
        <FlatList
          data={entries}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => <SyncRow item={item} />}
          contentContainerStyle={[s.list, { paddingBottom: botPad + 16 }]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={<EmptyState error={error} />}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#00E5FF"
              colors={["#00E5FF"]}
            />
          }
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  nebulaTR: {
    position: "absolute", top: -90, right: -70,
    width: 280, height: 280, borderRadius: 140,
    backgroundColor: "rgba(124,58,237,0.13)",
    shadowColor: "#7C3AED", shadowOffset: { width: 0, height: 0 },
    shadowRadius: 90, shadowOpacity: 0.55,
  },
  nebulaBL: {
    position: "absolute", bottom: -70, left: -70,
    width: 240, height: 240, borderRadius: 120,
    backgroundColor: "rgba(0,229,255,0.09)",
    shadowColor: "#00E5FF", shadowOffset: { width: 0, height: 0 },
    shadowRadius: 70, shadowOpacity: 0.4,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(30,30,60,0.7)",
  },
  backBtn: { width: 52 },
  backText: { color: "#00E5FF", fontSize: 12, fontWeight: "800", letterSpacing: 1 },
  headerCenter: { flex: 1, alignItems: "center", gap: 2 },
  headerBrand: { color: "#00E5FF", fontSize: 10, fontWeight: "800", letterSpacing: 4, opacity: 0.7 },
  headerTitle: { color: "#FFFFFF", fontSize: 16, fontWeight: "900", letterSpacing: 2 },
  statsBar: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(30,30,60,0.5)",
  },
  statChip: {
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(30,30,60,0.8)",
    backgroundColor: "rgba(14,14,36,0.7)",
  },
  statNum: { color: "#CCCCEE", fontSize: 18, fontWeight: "900" },
  statLbl: { color: "#4A4A7A", fontSize: 9, fontWeight: "800", letterSpacing: 1.5, marginTop: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  list: { paddingHorizontal: 14, paddingTop: 14 },
});
