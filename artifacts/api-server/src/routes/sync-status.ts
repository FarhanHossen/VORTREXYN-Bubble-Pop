import { Router, type IRouter } from "express";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const router: IRouter = Router();

const STATUS_FILE =
  process.env.SYNC_STATUS_FILE ??
  fileURLToPath(
    new URL("../../../scripts/.github-sync-status.json", import.meta.url)
  );

router.get("/sync-status", async (req, res) => {
  try {
    const raw = await readFile(STATUS_FILE, "utf8");
    const data = JSON.parse(raw) as {
      status: string;
      synced_at: string;
      cycle_duration_s: number;
    };
    res.json(data);
  } catch (err: unknown) {
    if (
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      (err as NodeJS.ErrnoException).code === "ENOENT"
    ) {
      res.status(404).json({ error: "No sync status recorded yet" });
    } else {
      req.log.error({ err }, "Failed to read sync status file");
      res.status(500).json({ error: "Failed to read sync status" });
    }
  }
});

export default router;
