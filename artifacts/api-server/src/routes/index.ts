import { Router, type IRouter } from "express";
import healthRouter from "./health";
import syncLogRouter from "./sync-log";
import syncStatusRouter from "./sync-status";

const router: IRouter = Router();

router.use(healthRouter);
router.use(syncLogRouter);
router.use(syncStatusRouter);

export default router;
