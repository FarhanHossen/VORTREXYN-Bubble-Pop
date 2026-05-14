#!/bin/bash
# github-sync-loop.sh
# Runs github-push.mjs on a schedule to automatically keep GitHub in sync.
#
# Configuration (set via Replit Secrets panel):
#   GITHUB_SYNC_INTERVAL  — how often to push, in seconds.
#                           Default: 1800 (30 minutes).
#                           Example values: 900 (15 min), 1800 (30 min), 3600 (1 hr).
#
# Change-detection:
#   Before each sync cycle, a local fingerprint is computed from the current
#   git HEAD SHA and a hash of any unstaged modifications (git diff HEAD).
#   If the fingerprint matches the one saved from the last successful sync,
#   the cycle is skipped entirely — no GitHub API calls are made.
#   The state is stored in: scripts/.github-sync-state

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PUSH_SCRIPT="$SCRIPT_DIR/github-push.mjs"
INTERVAL_SECONDS="${GITHUB_SYNC_INTERVAL:-1800}"  # default: every 30 minutes
STATE_FILE="$SCRIPT_DIR/.github-sync-state"
STATUS_FILE="$SCRIPT_DIR/.github-sync-status.json"

write_status() {
  local status="$1"
  local synced_at="$2"
  local cycle_duration_s="$3"
  printf '{"status":"%s","synced_at":"%s","cycle_duration_s":%s}\n' \
    "$status" "$synced_at" "$cycle_duration_s" > "$STATUS_FILE"
}

if ! [[ "$INTERVAL_SECONDS" =~ ^[1-9][0-9]*$ ]]; then
  echo "ERROR: GITHUB_SYNC_INTERVAL must be a positive integer (seconds). Got: '${INTERVAL_SECONDS}'" >&2
  exit 1
fi

echo "GitHub auto-sync started. Interval: ${INTERVAL_SECONDS}s"
echo "Pushing to GitHub every $(( INTERVAL_SECONDS / 60 )) minute(s)."
echo "  (To change, set the GITHUB_SYNC_INTERVAL secret in the Replit Secrets panel.)"

# Compute a fingerprint of the current local state.
#
# Design note — why a local fingerprint rather than the remote tree SHA:
#   github-push.mjs syncs on-disk content, not just committed content.  That
#   means unstaged edits to tracked files ARE included in every push.  A
#   remote tree SHA captured after the last push would not detect those edits,
#   so comparing HEAD^{tree} alone would incorrectly skip cycles that should
#   actually push.  Instead we combine two local inputs:
#
#     1. git rev-parse HEAD   — the committed state (covers new commits)
#     2. sha256(git diff HEAD) — byte-level diff of all unstaged modifications
#
#   Together they uniquely represent everything that would be included in the
#   next push.  If either changes, the fingerprint changes and the cycle runs.
#   If neither changes, no files have been added, modified, or deleted since
#   the last successful push, so the cycle can be skipped with zero API calls.
#
# State file: scripts/.github-sync-state  (gitignored, created at runtime)
local_fingerprint() {
  local head_sha
  head_sha="$(git rev-parse HEAD 2>/dev/null || echo 'no-git')"
  local diff_hash
  diff_hash="$(git diff HEAD 2>/dev/null | sha256sum | awk '{print $1}')"
  printf '%s\n%s' "$head_sha" "$diff_hash" | sha256sum | awk '{print $1}'
}

# Return 0 (true) if the argument is a valid sha256 hex fingerprint (exactly
# 64 lowercase hex characters), 1 otherwise.
is_valid_fingerprint() {
  [[ "${1:-}" =~ ^[0-9a-f]{64}$ ]]
}

# Read and validate the state file.  Prints the stored fingerprint if it is
# valid; prints nothing and returns 0 if the file is absent, empty, or
# contains a corrupt/truncated value so the caller treats it as "no prior
# state".
read_state_file() {
  local raw
  raw="$(cat "$STATE_FILE" 2>/dev/null || true)"
  if is_valid_fingerprint "$raw"; then
    printf '%s' "$raw"
  fi
  # Invalid, truncated, or absent content is silently discarded; the caller
  # receives an empty string and treats the cycle as having no prior state.
}

while true; do
  echo ""
  echo "──────────────────────────────────────────────"
  CYCLE_START=$(date +%s)
  echo "[$(date -u '+%Y-%m-%dT%H:%M:%SZ')] Starting sync cycle..."

  # ── Local change-detection ──────────────────────────────────────────────
  CURRENT_FINGERPRINT="$(local_fingerprint)"
  LAST_FINGERPRINT="$(read_state_file)"

  if [ "$CURRENT_FINGERPRINT" = "$LAST_FINGERPRINT" ]; then
    CYCLE_END=$(date +%s)
    CYCLE_DURATION=$(( CYCLE_END - CYCLE_START ))
    echo "[$(date -u '+%Y-%m-%dT%H:%M:%SZ')] Cycle skipped — no local changes since last sync  cycle_duration=${CYCLE_DURATION}s"
    write_status "skipped" "$(date -u '+%Y-%m-%dT%H:%M:%SZ')" "$CYCLE_DURATION"
    # Re-verify the state file is still readable after a skip so that a
    # deletion or corruption that happens between cycles is caught on the
    # very next iteration rather than silently causing duplicate pushes.
    if ! is_valid_fingerprint "$(cat "$STATE_FILE" 2>/dev/null || true)"; then
      echo "[WARN] State file is no longer readable/valid after skip — it will be treated as missing on the next cycle." >&2
    fi
    echo "──────────────────────────────────────────────"
    echo "[$(date -u '+%Y-%m-%dT%H:%M:%SZ')] Next sync in ${INTERVAL_SECONDS}s..."
    sleep "$INTERVAL_SECONDS"
    continue
  fi
  # ────────────────────────────────────────────────────────────────────────

  if node "$PUSH_SCRIPT"; then
    CYCLE_STATUS="ok"
    # Save the fingerprint so the next cycle can skip if nothing changes.
    echo "$CURRENT_FINGERPRINT" > "$STATE_FILE"
  else
    CYCLE_STATUS="failed"
    echo "[WARN] GitHub push script exited with an error — will retry next cycle."
    # Do NOT update the state file on failure so the next cycle retries.
  fi
  CYCLE_END=$(date +%s)
  CYCLE_DURATION=$(( CYCLE_END - CYCLE_START ))
  if [ "$CYCLE_STATUS" = "ok" ]; then
    write_status "pushed" "$(date -u '+%Y-%m-%dT%H:%M:%SZ')" "$CYCLE_DURATION"
  else
    write_status "failed" "$(date -u '+%Y-%m-%dT%H:%M:%SZ')" "$CYCLE_DURATION"
  fi
  echo "[$(date -u '+%Y-%m-%dT%H:%M:%SZ')] Cycle complete — status=${CYCLE_STATUS}  cycle_duration=${CYCLE_DURATION}s"
  echo "──────────────────────────────────────────────"
  echo "[$(date -u '+%Y-%m-%dT%H:%M:%SZ')] Next sync in ${INTERVAL_SECONDS}s..."
  sleep "$INTERVAL_SECONDS"
done
