/**
 * github-push.mjs
 * Mirrors the local tracked files to GitHub via the REST API.
 * Handles additions, modifications, and deletions — only git-tracked files
 * are synced (untracked files are never pushed).
 * Run via: node scripts/github-push.mjs
 *
 * Diff-first optimisation: the remote tree is fetched once and each local
 * file's blob SHA (computed from on-disk content) is compared against it.
 * Only new or modified files are uploaded as new blobs; unchanged files are
 * referenced by their existing SHA so that sync cycles with few changes
 * complete in seconds.
 *
 * NOTE: The SHA is computed from the actual file bytes on disk using git's
 * blob object format — sha1("blob <size>\0<content>") — so unstaged
 * modifications are always detected correctly.
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const TOKEN = process.env.GITHUB_PERSONAL_ACCESS_TOKEN;
const OWNER = 'FarhanHossen';
const REPO  = 'VORTREXYN-Bubble-Pop';
let BRANCH = 'main';
const BASE   = 'https://api.github.com';

if (!TOKEN) {
  console.error('ERROR: GITHUB_PERSONAL_ACCESS_TOKEN is not set.');
  process.exit(1);
}

const headers = {
  'Authorization': `Bearer ${TOKEN}`,
  'Accept': 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
  'Content-Type': 'application/json',
};

async function api(method, endpoint, body) {
  const res = await fetch(`${BASE}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) {
    const err = new Error(`GitHub API error ${res.status} on ${method} ${endpoint}: ${text.slice(0, 500)}`);
    err.status = res.status;
    throw err;
  }
  return JSON.parse(text);
}

/**
 * Computes the git blob SHA for raw file bytes.
 * Git blob SHA = sha1("blob <byteLength>\0<content>").
 * This matches what GitHub stores and what `git hash-object` produces,
 * and is derived from on-disk content — not from the index — so unstaged
 * modifications are always detected.
 *
 * @param {Buffer} raw - Raw file bytes
 * @returns {string} Lowercase hex SHA1
 */
function computeGitBlobSha(raw) {
  const header = Buffer.from(`blob ${raw.length}\0`);
  return crypto
    .createHash('sha1')
    .update(header)
    .update(raw)
    .digest('hex');
}

/**
 * Returns only git-tracked files with their git-recorded mode.
 * Untracked files are intentionally excluded to avoid publishing unintended content.
 * Using --stage captures the mode (100644 regular, 100755 executable) as stored in git.
 */
function getTrackedFiles() {
  const lines = execSync('git ls-files --stage', { encoding: 'utf8' }).trim().split('\n').filter(Boolean);
  return lines.map(line => {
    // Format: "<mode> <sha> <stage>\t<path>"
    const tab = line.indexOf('\t');
    const filePath = line.slice(tab + 1);
    const mode = line.slice(0, 6);
    return { filePath, mode };
  });
}

/**
 * Fetches the remote tree recursively and returns a Map of filePath → blob SHA.
 * This is used to diff against local files so only changed content is uploaded.
 * Returns null if the tree is truncated (fall back to full upload in that case).
 */
async function getRemoteTreeMap(treeSha) {
  const data = await api('GET', `/repos/${OWNER}/${REPO}/git/trees/${treeSha}?recursive=1`);
  if (data.truncated) {
    console.warn('[WARN] Remote tree was truncated — falling back to full upload for safety.');
    return null;
  }
  const map = new Map();
  for (const item of data.tree) {
    if (item.type === 'blob') {
      map.set(item.path, item.sha);
    }
  }
  return map;
}

async function createBlob(content, encoding = 'base64') {
  const data = await api('POST', `/repos/${OWNER}/${REPO}/git/blobs`, { content, encoding });
  return data.sha;
}

function buildCommitMessage() {
  try {
    const msg = execSync('git log -1 --pretty=%s', { encoding: 'utf8' }).trim();
    const lower = msg.toLowerCase();
    const replitPhrases = [
      'replit', 'auto-sync', 'auto sync', 'checkpoint',
      'add image file to asset', 'attached_assets', 'attached assets',
    ];
    const isGenerated = replitPhrases.some(p => lower.includes(p));
    return isGenerated ? 'Update' : msg;
  } catch {
    return 'Update';
  }
}

/**
 * Builds a complete, standalone tree of all tracked files.
 * By NOT using base_tree, the resulting tree contains exactly the current
 * local state — so any files deleted locally are absent from the tree,
 * correctly reflecting their removal on GitHub as well.
 *
 * When remoteTreeMap is provided, each file's SHA is computed from on-disk
 * bytes and compared against the remote. Only new or modified files are
 * uploaded; unchanged files reuse their existing remote SHA.
 * Files present in remoteTreeMap but absent locally are explicitly identified
 * as deletions and logged by name.
 */
async function buildCompleteTree(remoteTreeMap) {
  const files = getTrackedFiles();
  const localPaths = new Set(files.map(f => f.filePath));
  const treeItems = [];
  let uploaded = 0;
  let reused = 0;
  let skippedMissing = 0;

  // Detect deletions: files on remote that are no longer tracked locally.
  // When remoteTreeMap is null (API failure or truncated tree), deletion
  // detection is skipped and counts are best-effort (all local files appear
  // as uploads; deletions are still applied via the standalone tree but
  // cannot be individually named or counted).
  const deletedFiles = [];
  if (remoteTreeMap) {
    for (const remotePath of remoteTreeMap.keys()) {
      if (!localPaths.has(remotePath)) {
        deletedFiles.push(remotePath);
      }
    }
  } else {
    console.log('  [NOTE] Remote tree unavailable — change counts are approximate and deleted files cannot be individually identified.');
  }

  console.log(`Processing ${files.length} tracked files...`);
  for (const { filePath, mode } of files) {
    const fullPath = path.resolve(filePath);
    if (!fs.existsSync(fullPath)) { skippedMissing++; continue; }
    const stat = fs.statSync(fullPath);
    if (!stat.isFile()) { skippedMissing++; continue; }

    const raw = fs.readFileSync(fullPath);

    if (remoteTreeMap) {
      const remoteSha = remoteTreeMap.get(filePath);
      if (remoteSha !== undefined) {
        // Compute the git blob SHA from actual on-disk bytes.
        // This correctly detects modifications even when they are not staged.
        const localSha = computeGitBlobSha(raw);
        if (localSha === remoteSha) {
          // File is identical to remote — reuse blob SHA without uploading.
          treeItems.push({ path: filePath, mode, type: 'blob', sha: remoteSha });
          reused++;
          continue;
        }
      }
      // File is new or modified — fall through to upload.
    }

    const b64 = raw.toString('base64');
    const sha = await createBlob(b64, 'base64');
    treeItems.push({ path: filePath, mode, type: 'blob', sha });
    uploaded++;

    if (uploaded % 10 === 0) console.log(`  ${uploaded} uploaded so far...`);
  }

  // Log the change breakdown before pushing.
  console.log(`  ${uploaded} added/modified, ${reused} unchanged, ${deletedFiles.length} deleted.`);
  if (deletedFiles.length > 0) {
    console.log('  Deleted files:');
    for (const f of deletedFiles) {
      console.log(`    - ${f}`);
    }
  }
  if (skippedMissing > 0) {
    console.log(`  ${skippedMissing} file(s) skipped (not found on disk).`);
  }

  // Build tree WITHOUT base_tree — this is a complete, authoritative snapshot.
  // Files not in treeItems are simply absent, which correctly handles deletions.
  const newTree = await api('POST', `/repos/${OWNER}/${REPO}/git/trees`, {
    tree: treeItems,
  });

  return { newTree, uploaded, reused, deleted: deletedFiles.length };
}

async function getRemoteHead() {
  const refData = await api('GET', `/repos/${OWNER}/${REPO}/git/ref/heads/${BRANCH}`);
  return refData.object.sha;
}

/**
 * Builds the Slack payload for a sync summary using the attachments API.
 * Slack colour field accepts CSS hex colours.
 */
function buildSlackPayload(summary) {
  const { status, added_modified = 0, deleted = 0, commit_sha, repo, branch, error, duration_ms } = summary;
  const durationSec = duration_ms != null ? (duration_ms / 1000).toFixed(1) : '?';

  if (status === 'pushed') {
    const shortSha = commit_sha ? commit_sha.slice(0, 7) : '?';
    const commitUrl = `https://github.com/${repo}/commit/${commit_sha}`;
    const changed = added_modified + deleted;
    return {
      attachments: [
        {
          color: '#2eb886',
          fallback: `✅ Synced ${changed} file(s) to ${branch} — ${shortSha}`,
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `✅ *Synced ${changed} file(s) to \`${branch}\`* — <${commitUrl}|${shortSha}>`,
              },
            },
            {
              type: 'context',
              elements: [
                {
                  type: 'mrkdwn',
                  text: `${added_modified} added/modified · ${deleted} deleted · ${durationSec}s · ${repo}`,
                },
              ],
            },
          ],
        },
      ],
    };
  }

  if (status === 'skipped') {
    return {
      attachments: [
        {
          color: '#d3d3d3',
          fallback: `⏭️ Sync skipped — no changes on ${branch}`,
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `⏭️ *Sync skipped* — no changes on \`${branch}\``,
              },
            },
            {
              type: 'context',
              elements: [
                { type: 'mrkdwn', text: `${durationSec}s · ${repo}` },
              ],
            },
          ],
        },
      ],
    };
  }

  // status === 'failed'
  return {
    attachments: [
      {
        color: '#e01e5a',
        fallback: `❌ Sync failed — ${error}`,
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `❌ *Sync failed*`,
            },
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `\`\`\`${error}\`\`\``,
            },
          },
          {
            type: 'context',
            elements: [
              { type: 'mrkdwn', text: `${durationSec}s · ${repo}` },
            ],
          },
        ],
      },
    ],
  };
}

/**
 * Builds the Discord payload for a sync summary using the embeds API.
 * Discord colour field is a decimal integer (not hex string).
 */
function buildDiscordPayload(summary) {
  const { status, added_modified = 0, deleted = 0, commit_sha, repo, branch, error, duration_ms } = summary;
  const durationSec = duration_ms != null ? (duration_ms / 1000).toFixed(1) : '?';

  if (status === 'pushed') {
    const shortSha = commit_sha ? commit_sha.slice(0, 7) : '?';
    const commitUrl = `https://github.com/${repo}/commit/${commit_sha}`;
    const changed = added_modified + deleted;
    return {
      embeds: [
        {
          title: `✅ Synced ${changed} file(s) to \`${branch}\``,
          url: commitUrl,
          color: 0x2eb886,
          fields: [
            { name: 'Commit', value: `[\`${shortSha}\`](${commitUrl})`, inline: true },
            { name: 'Added / Modified', value: String(added_modified), inline: true },
            { name: 'Deleted', value: String(deleted), inline: true },
          ],
          footer: { text: `${repo} · ${durationSec}s` },
          timestamp: summary.timestamp,
        },
      ],
    };
  }

  if (status === 'skipped') {
    return {
      embeds: [
        {
          title: `⏭️ Sync skipped — no changes on \`${branch}\``,
          color: 0xb0b0b0,
          footer: { text: `${repo} · ${durationSec}s` },
          timestamp: summary.timestamp,
        },
      ],
    };
  }

  // status === 'failed'
  return {
    embeds: [
      {
        title: '❌ Sync failed',
        description: `\`\`\`\n${error}\n\`\`\``,
        color: 0xe01e5a,
        footer: { text: `${repo} · ${durationSec}s` },
        timestamp: summary.timestamp,
      },
    ],
  };
}

async function postWebhook(url, payload, label) {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      console.warn(`[WARN] ${label} webhook POST failed with status ${res.status}`);
    }
  } catch (err) {
    console.warn(`[WARN] ${label} webhook POST error: ${err.message}`);
  }
}

async function sendWebhookSummary(summary) {
  const webhooks = [
    { url: process.env.GITHUB_SYNC_WEBHOOK_URL, payload: summary, label: 'Generic' },
    { url: process.env.SLACK_WEBHOOK_URL, payload: buildSlackPayload(summary), label: 'Slack' },
    { url: process.env.DISCORD_WEBHOOK_URL, payload: buildDiscordPayload(summary), label: 'Discord' },
  ].filter(w => w.url);

  await Promise.all(webhooks.map(w => postWebhook(w.url, w.payload, w.label)));
}

/**
 * Posts the sync summary to the internal API so it is persisted in the database
 * and can be displayed in the Sync History screen.
 * Failures are silently swallowed — a database write error should never block a sync.
 */
async function postSyncLog(summary) {
  const apiBase = process.env.SYNC_LOG_API_URL || 'http://localhost:80';
  try {
    const body = {
      status: summary.status,
      added_modified: summary.added_modified ?? 0,
      deleted: summary.deleted ?? 0,
      reused: summary.reused ?? 0,
      duration_ms: summary.duration_ms ?? 0,
      commit_sha: summary.commit_sha ?? null,
      commit_message: summary.commit_message ?? null,
      repo: summary.repo ?? null,
      branch: summary.branch ?? null,
      error_message: summary.error ?? null,
    };
    const extraHeaders = {};
    if (process.env.SYNC_LOG_SECRET) {
      extraHeaders['x-sync-log-secret'] = process.env.SYNC_LOG_SECRET;
    }
    const res = await fetch(`${apiBase}/api/sync-log`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...extraHeaders },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      console.warn(`[WARN] Failed to persist sync log (HTTP ${res.status})`);
    }
  } catch (err) {
    console.warn('[WARN] Could not reach sync-log API:', err.message);
  }
}

async function run() {
  const startMs = Date.now();
  console.log('Connecting to GitHub...');

  // Detect the default branch
  const repoInfo = await api('GET', `/repos/${OWNER}/${REPO}`);
  BRANCH = repoInfo.default_branch;
  console.log('Using branch:', BRANCH);

  const parentSha = await getRemoteHead();
  console.log('Remote HEAD:', parentSha);

  const remoteCommit = await api('GET', `/repos/${OWNER}/${REPO}/git/commits/${parentSha}`);
  const remoteTreeSha = remoteCommit.tree.sha;
  console.log('Remote tree:', remoteTreeSha);

  // Fetch the remote tree for diffing. If the fetch fails or is truncated,
  // fall back to uploading everything (remoteTreeMap will be null).
  let remoteTreeMap = null;
  try {
    remoteTreeMap = await getRemoteTreeMap(remoteTreeSha);
  } catch (err) {
    console.warn('[WARN] Could not fetch remote tree for diffing — falling back to full upload:', err.message);
  }

  // Build the complete local snapshot tree, uploading only changed files
  const { newTree, uploaded, reused, deleted } = await buildCompleteTree(remoteTreeMap);

  // Skip commit if the tree is identical to the remote
  if (newTree.sha === remoteTreeSha) {
    const durationMs = Date.now() - startMs;
    const summary = {
      status: 'skipped',
      reason: 'no_changes',
      added_modified: 0,
      deleted: 0,
      reused,
      duration_ms: durationMs,
      timestamp: new Date().toISOString(),
      repo: `${OWNER}/${REPO}`,
      branch: BRANCH,
    };
    console.log('');
    console.log(`[SYNC SUMMARY] status=skipped  added/modified=0  deleted=0  reused=${reused}  duration=${(durationMs / 1000).toFixed(1)}s  reason=no_changes`);
    await Promise.all([sendWebhookSummary(summary), postSyncLog(summary)]);
    return;
  }

  const message = buildCommitMessage();
  console.log('Commit message:', message);

  // Try to push. On a non-fast-forward conflict, re-fetch the remote HEAD
  // and retry (up to 3 attempts). The tree is standalone so it can be
  // safely reused across retries with a fresh parent commit.
  const MAX_RETRIES = 3;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const currentParentSha = attempt === 1 ? parentSha : await getRemoteHead();

    const newCommit = await api('POST', `/repos/${OWNER}/${REPO}/git/commits`, {
      message,
      tree: newTree.sha,
      parents: [currentParentSha],
    });

    try {
      await api('PATCH', `/repos/${OWNER}/${REPO}/git/refs/heads/${BRANCH}`, {
        sha: newCommit.sha,
        force: false,
      });
      const durationMs = Date.now() - startMs;
      const summary = {
        status: 'pushed',
        added_modified: uploaded,
        deleted,
        reused,
        commit_sha: newCommit.sha,
        commit_message: message,
        duration_ms: durationMs,
        timestamp: new Date().toISOString(),
        repo: `${OWNER}/${REPO}`,
        branch: BRANCH,
      };
      console.log('');
      console.log(`[SYNC SUMMARY] status=pushed  added/modified=${uploaded}  deleted=${deleted}  reused=${reused}  duration=${(durationMs / 1000).toFixed(1)}s  commit=${newCommit.sha.slice(0, 7)}`);
      console.log(`  → https://github.com/${OWNER}/${REPO}/commit/${newCommit.sha}`);
      await Promise.all([sendWebhookSummary(summary), postSyncLog(summary)]);
      return;
    } catch (err) {
      if (err.status === 422 && attempt < MAX_RETRIES) {
        console.warn(`[WARN] Non-fast-forward detected (attempt ${attempt}/${MAX_RETRIES}). Retrying with updated remote HEAD...`);
        continue;
      }
      throw new Error(`Failed to update ref after ${attempt} attempt(s): ${err.message}`);
    }
  }
}

const _runStartMs = Date.now();
run().catch(async err => {
  const durationMs = Date.now() - _runStartMs;
  console.error(err);
  console.log('');
  console.log(`[SYNC SUMMARY] status=failed  duration=${(durationMs / 1000).toFixed(1)}s  error=${err.message.slice(0, 120)}`);
  const failSummary = {
    status: 'failed',
    error: err.message,
    duration_ms: durationMs,
    timestamp: new Date().toISOString(),
    repo: `${OWNER}/${REPO}`,
    branch: BRANCH,
  };
  await Promise.all([
    sendWebhookSummary(failSummary).catch(() => {}),
    postSyncLog(failSummary).catch(() => {}),
  ]);
  process.exit(1);
});
