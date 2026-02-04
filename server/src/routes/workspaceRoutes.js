import express from "express";
import { protect } from "../middleware/authMiddleware.js";

import {
    requireWorkspaceMember,
    requireRole,
} from "../middleware/workspaceMiddleware.js";
import { createWorkspace, getUserWorkspaces } from "../controllers/workspaceController.js";


const router = express.Router();

router.get("/", protect, getUserWorkspaces);

router.post("/", protect, createWorkspace);

router.get(
    "/:workspaceId",
    protect,
    requireWorkspaceMember,
    (req, res) => {
        res.json(req.workspace);
    }
);

export default router;