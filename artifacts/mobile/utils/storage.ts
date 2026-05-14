/**
 * storage.ts
 *
 * All Firestore read/write operations for the global leaderboard.
 *
 * Data model — Firestore collection: "scores"
 * ─────────────────────────────────────────────
 * Each document stores ONE player's personal best for a specific combination
 * of game settings (difficulty + timeLimit + speed + maxBubbles).
 *
 * Document ID format:  {userId}_{difficulty}_{timeLimit}_{speed}_{maxBubbles}
 * Example:             abc123_easy_60_1_15
 * Extreme mode uses "X" for maxBubbles (no bubble limit in that mode).
 *
 * Compound IDs mean a player can appear multiple times on the leaderboard —
 * once per unique settings combination — so difficulty/speed/time filters
 * show fair comparisons.
 *
 * Exports:
 *   HighScore        — shape of a leaderboard document
 *   ScoreFilter      — optional filter applied when reading scores
 *   saveHighScore()  — write/update a personal best
 *   getHighScores()  — fetch and optionally filter the leaderboard
 *   clearUserScores()— delete all of the current user's score documents
 */

import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  setDoc,
  where,
} from "firebase/firestore";

import { db } from "@/lib/firebase";

/** Shape of a single Firestore score document (plus its `id` field). */
export interface HighScore {
  id: string;
  playerName: string;
  score: number;
  date: string;         // Human-readable date string (e.g. "4/27/2026")
  userId: string;       // Firebase Auth UID — used to identify the current user's rows
  difficulty?: string;  // "easy" | "medium" | "hard" | "extreme"
  timeLimit?: number;   // Game duration in seconds (30 / 60 / 90 / 120 / 180)
  maxBubbles?: number | null; // Max concurrent bubbles; null for extreme mode
  speed?: number;       // Speed option label (1 / 2 / 3) — NOT the physics multiplier
}

/** Criteria used to filter the leaderboard client-side after fetching. */
export interface ScoreFilter {
  difficulty?: string;
  timeLimit?: number;
  maxBubbles?: number | null;
  speed?: number;
}

/**
 * Builds the compound Firestore document ID for a given settings combination.
 * Extreme mode substitutes "X" for maxBubbles since it has no bubble limit.
 */
function scoreDocId(
  userId: string,
  difficulty: string,
  timeLimit: number,
  maxBubbles: number,
  speed: number
): string {
  const mb = difficulty === "extreme" ? "X" : String(maxBubbles);
  return `${userId}_${difficulty}_${timeLimit}_${speed}_${mb}`;
}

/**
 * Writes or updates a player's personal best for the given settings combination.
 *
 * Only overwrites the existing document if the new score is strictly higher.
 * This means each player has at most one entry per unique settings combo.
 *
 * @param playerName - Display name shown on the leaderboard
 * @param score      - Final score achieved in this round
 * @param userId     - Firebase Auth UID of the logged-in player
 * @param settings   - The game settings used in this round (optional for legacy calls)
 */
export async function saveHighScore(
  playerName: string,
  score: number,
  userId: string,
  settings?: {
    difficulty: string;
    timeLimit: number;
    maxBubbles: number;
    speed: number;
  }
): Promise<void> {
  if (!userId) return;

  let docId: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let fields: Record<string, any>;

  if (settings) {
    // New format: compound doc ID based on settings so each combo gets its own entry
    docId = scoreDocId(
      userId,
      settings.difficulty,
      settings.timeLimit,
      settings.maxBubbles,
      settings.speed
    );
    fields = {
      playerName: playerName.trim(),
      score,
      date: new Date().toLocaleDateString(),
      userId,
      timestamp: Date.now(),
      difficulty: settings.difficulty,
      timeLimit: settings.timeLimit,
      maxBubbles: settings.difficulty === "extreme" ? null : settings.maxBubbles,
      speed: settings.speed, // stored as 1/2/3 label, not the physics multiplier
    };
  } else {
    // Legacy format: doc ID is just the userId (one entry per player globally)
    docId = userId;
    fields = {
      playerName: playerName.trim(),
      score,
      date: new Date().toLocaleDateString(),
      userId,
      timestamp: Date.now(),
    };
  }

  try {
    const ref = doc(db, "scores", docId);
    const existing = await getDoc(ref);
    // Only write if this is a new entry OR the score beats the previous best
    if (!existing.exists() || score > (existing.data().score ?? 0)) {
      await setDoc(ref, fields);
    }
  } catch (e) {
    console.warn("[saveHighScore] Firestore write failed:", e);
  }
}

/**
 * Fetches the global leaderboard, sorted by score descending.
 *
 * Fetches up to 200 documents, then applies client-side filtering to match
 * the selected difficulty/time/bubbles/speed filter (if any).
 *
 * Deduplication: after filtering, only the highest score per userId is kept,
 * so each player appears at most once in the final list.
 *
 * @param filter - Optional settings filter. Omit to get all scores.
 * @returns Array of HighScore objects, sorted high → low, deduplicated per user.
 */
export async function getHighScores(filter?: ScoreFilter): Promise<HighScore[]> {
  try {
    const q = query(
      collection(db, "scores"),
      orderBy("score", "desc"),
      limit(200)   // Cap at 200 docs to keep read costs low
    );
    const snapshot = await getDocs(q);
    let all = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as HighScore));

    // Apply client-side filters (Firestore compound indexes not required this way)
    if (filter) {
      if (filter.difficulty !== undefined) {
        all = all.filter((s) => s.difficulty === filter.difficulty);
      }
      if (filter.timeLimit !== undefined) {
        all = all.filter((s) => s.timeLimit === filter.timeLimit);
      }
      if (filter.speed !== undefined) {
        all = all.filter((s) => s.speed === filter.speed);
      }
      // Max-bubbles filter is irrelevant for extreme mode (those docs have null)
      if (filter.maxBubbles !== undefined && filter.difficulty !== "extreme") {
        all = all.filter((s) => s.maxBubbles === filter.maxBubbles);
      }
    }

    // Deduplicate: keep only the first (highest) score encountered per user
    const seen = new Set<string>();
    return all.filter((s) => {
      if (seen.has(s.userId)) return false;
      seen.add(s.userId);
      return true;
    });
  } catch (e) {
    console.warn("[getHighScores] Firestore read failed:", e);
    return [];
  }
}

/**
 * Returns aggregate community stats derived from the scores collection.
 *
 * totalPlayers — count of unique userIds across all documents
 * totalScores  — total number of score documents stored
 */
export async function getPlayerStats(): Promise<{ totalPlayers: number; totalScores: number }> {
  try {
    const snapshot = await getDocs(collection(db, "scores"));
    const uniqueUsers = new Set<string>();
    snapshot.docs.forEach((d) => {
      const uid = (d.data() as HighScore).userId;
      if (uid) uniqueUsers.add(uid);
    });
    return { totalPlayers: uniqueUsers.size, totalScores: snapshot.size };
  } catch {
    return { totalPlayers: 0, totalScores: 0 };
  }
}

/**
 * Deletes all score documents belonging to the given user.
 * Used by the "CLEAR MINE" button on the leaderboard screen.
 *
 * Queries for every doc where `userId == userId`, then deletes them in parallel.
 */
export async function clearUserScores(userId: string): Promise<void> {
  if (!userId) return;
  try {
    const q = query(collection(db, "scores"), where("userId", "==", userId));
    const snapshot = await getDocs(q);
    // Delete all matching documents concurrently
    await Promise.all(snapshot.docs.map((d) => deleteDoc(d.ref)));
  } catch (e) {
    console.warn("[clearUserScores] Firestore delete failed:", e);
  }
}
