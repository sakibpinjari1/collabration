import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { requireWorkspaceMember } from "../middleware/workspaceMiddleware.js";
import { getActivityFeed } from "../controllers/activityController.js";


const router = express.Router();

router.get(
    "/:workspaceId/activity",
    protect,
    requireWorkspaceMember,
    getActivityFeed
);

export default router;

