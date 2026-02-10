import express from "express";
import { protect } from "../middleware/authMiddleware.js";

import {
  requireWorkspaceMember,
  requireRole,
} from "../middleware/workspaceMiddleware.js";
import {
  createWorkspace,
  getUserWorkspaces,
  inviteToWorkspace,
  updateMemberRole,
  removeMember,
  getMyInvites,
  acceptInvite,
  declineInvite,
} from "../controllers/workspaceController.js";

const router = express.Router();

router.get("/", protect, getUserWorkspaces);

router.post("/", protect, createWorkspace);

router.get(
  "/:workspaceId",
  protect,
  requireWorkspaceMember,
  async (req, res) => {
    const workspace = await req.workspace.populate(
      "members.userId",
      "name email",
    );
    res.json(workspace);
  },
);

router.post(
  "/:workspaceId/invite",
  protect,
  requireWorkspaceMember,
  requireRole(["OWNER"]),
  inviteToWorkspace,
);

router.patch(
  "/:workspaceId/members/:memberId",
  protect,
  requireWorkspaceMember,
  requireRole(["OWNER"]),
  updateMemberRole,
);

router.delete(
  "/:workspaceId/members/:memberId",
  protect,
  requireWorkspaceMember,
  requireRole(["OWNER"]),
  removeMember,
);

router.get("/invites/me", protect, getMyInvites);
router.post("/invites/:inviteId/accept", protect, acceptInvite);
router.post("/invites/:inviteId/decline", protect, declineInvite);

export default router;
