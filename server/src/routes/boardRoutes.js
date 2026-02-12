import express from "express";

import { protect } from "../middleware/authMiddleware.js";
import { requireWorkspaceMember, requireRole} from "../middleware/workspaceMiddleware.js";
import { createBoard, getBoards, reorderBoards } from "../controllers/boardController.js";

const router = express.Router();

router.post(
    "/:workspaceId/boards",
    protect,
    requireWorkspaceMember,
    requireRole(["OWNER", "MEMBER"]),
    createBoard
);

router.get(
    "/:workspaceId/boards",
    protect,
    requireWorkspaceMember,
    getBoards
);

router.patch(
    "/:workspaceId/boards/reorder",
    protect,
    requireWorkspaceMember,
    requireRole(["OWNER", "MEMBER"]),
    reorderBoards
);

export default router;
