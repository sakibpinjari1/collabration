import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { requireWorkspaceMember } from "../middleware/workspaceMiddleware.js";
import { getActivityFeed, exportActivityCsv } from "../controllers/activityController.js";


const router = express.Router();

router.get(
    "/:workspaceId/activity",
    protect,
    requireWorkspaceMember,
    getActivityFeed
);

router.get(
    "/:workspaceId/activity/export",
    protect,
    requireWorkspaceMember,
    exportActivityCsv
);

export default router;

