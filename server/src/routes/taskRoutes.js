import express from "express";
import { protect } from "../middleware/authMiddleware.js"
import {
    requireWorkspaceMember,
    requireRole,
} from "../middleware/workspaceMiddleware.js";
import {
    createTask,
    getTasks,
    updateTask,
    archiveTask,
    assignTask,
} from "../controllers/taskController.js";

const router = express.Router();

router.post(
    "/:workspaceId/boards/:boardId/tasks",
    protect,
    requireWorkspaceMember,
    requireRole(["OWNER", "MEMBER"]),
    createTask
);

router.get(
    "/:workspaceId/boards/:boardId/tasks",
    protect,
    requireWorkspaceMember,
    getTasks
);

router.patch(
    "/:workspaceId/tasks/:taskId",
    protect,
    requireWorkspaceMember,
    requireRole(["OWNER", "MEMBER"]),
    updateTask
);

router.delete(
    "/:workspaceId/tasks/:taskId",
    protect,
    requireWorkspaceMember,
    requireRole(["OWNER", "MEMBER"]),
    archiveTask
);

router.post(
    "/:workspaceId/tasks/:taskId/assign",
    protect,
    requireWorkspaceMember,
    requireRole(["OWNER", "MEMBER"]),
    assignTask
);

export default router;