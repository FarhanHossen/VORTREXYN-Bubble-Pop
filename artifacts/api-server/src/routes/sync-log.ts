import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { db, syncLogTable, insertSyncLogSchema } from "@workspace/db";
import { desc } from "drizzle-orm";

const router: IRouter = Router();

/**
 * Lightweight write protection for POST /sync-log.
 * If SYNC_LOG_SECRET is set, callers must supply the same value in the
 * X-Sync-Log-Secret header.  GET remains unauthenticated (read-only).
 */
const SYNC_LOG_SECRET = process.env.SYNC_LOG_SECRET;

function requireSecret(req: Request, res: Response, next: NextFunction) {
  if (SYNC_LOG_SECRET && req.headers["x-sync-log-secret"] !== SYNC_LOG_SECRET) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}

router.post("/sync-log", requireSecret, async (req, res) => {
  const parsed = insertSyncLogSchema.safeParse({
    status: req.body.status,
    addedModified: req.body.added_modified ?? 0,
    deleted: req.body.deleted ?? 0,
    reused: req.body.reused ?? 0,
    durationMs: req.body.duration_ms,
    commitSha: req.body.commit_sha ?? null,
    commitMessage: req.body.commit_message ?? null,
    repo: req.body.repo ?? null,
    branch: req.body.branch ?? null,
    errorMessage: req.body.error_message ?? null,
  });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }
  const [row] = await db.insert(syncLogTable).values(parsed.data).returning();
  res.status(201).json(toApiShape(row));
});

router.get("/sync-log", async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 50, 200);
  const rows = await db
    .select()
    .from(syncLogTable)
    .orderBy(desc(syncLogTable.syncedAt))
    .limit(limit);
  res.json(rows.map(toApiShape));
});

function toApiShape(row: typeof syncLogTable.$inferSelect) {
  return {
    id: row.id,
    status: row.status,
    added_modified: row.addedModified,
    deleted: row.deleted,
    reused: row.reused,
    duration_ms: row.durationMs,
    commit_sha: row.commitSha,
    commit_message: row.commitMessage,
    repo: row.repo,
    branch: row.branch,
    error_message: row.errorMessage,
    synced_at: row.syncedAt,
  };
}

export default router;
