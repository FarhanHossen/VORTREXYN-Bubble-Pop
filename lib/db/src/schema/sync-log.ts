import { integer, pgEnum, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const syncStatusEnum = pgEnum("sync_status", ["pushed", "skipped", "failed"]);

export const syncLogTable = pgTable("sync_log", {
  id: serial("id").primaryKey(),
  status: syncStatusEnum("status").notNull(),
  addedModified: integer("added_modified").notNull().default(0),
  deleted: integer("deleted").notNull().default(0),
  reused: integer("reused").notNull().default(0),
  durationMs: integer("duration_ms").notNull(),
  commitSha: text("commit_sha"),
  commitMessage: text("commit_message"),
  repo: text("repo"),
  branch: text("branch"),
  errorMessage: text("error_message"),
  syncedAt: timestamp("synced_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertSyncLogSchema = createInsertSchema(syncLogTable).omit({
  id: true,
  syncedAt: true,
});

export type InsertSyncLog = z.infer<typeof insertSyncLogSchema>;
export type SyncLog = typeof syncLogTable.$inferSelect;
