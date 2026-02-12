import { requireRole, requireWorkspaceMember } from "../middleware/workspaceMiddleware.js";
import Task from "../models/Task.js";
import createActivityEvent from "../utils/createActivityEvent.js";
import { io } from "../../server.js";
import Comment from "../models/Comment.js";
import ActivityEvent from "../models/ActivityEvent.js";
import Workspace from "../models/Workspace.js";
import Board from "../models/Board.js";

const ensureBoardInWorkspace = async (boardId, workspaceId) => {
    const board = await Board.findById(boardId).select("workspaceId");
    if (!board) return { ok: false, status: 404, message: "Board not found" };
    if (board.workspaceId.toString() !== workspaceId.toString()) {
        return { ok: false, status: 403, message: "Board not in workspace" };
    }
    return { ok: true, board };
};

const ensureTaskInWorkspace = async (taskId, workspaceId) => {
    const task = await Task.findById(taskId);
    if (!task) return { ok: false, status: 404, message: "Task not found" };
    const boardCheck = await ensureBoardInWorkspace(task.boardId, workspaceId);
    if (!boardCheck.ok) {
        return { ok: false, status: boardCheck.status, message: boardCheck.message };
    }
    return { ok: true, task };
};

export const createTask = async(req, res) => {
    const { title, description, priority } = req.body;
    const { boardId, workspaceId } = req.params;

    const boardCheck = await ensureBoardInWorkspace(boardId, workspaceId);
    if (!boardCheck.ok) {
        return res.status(boardCheck.status).json({ message: boardCheck.message });
    }
    
    const task = await Task.create({
        boardId,
        title,
        description,
        priority
    });
    
    await createActivityEvent({
        workspaceId,
        actorId: req.userId,
        type: "TASK_CREATED",
        entityId: task._id,
        metadata: {
            title: task.title,
        },
        status: "TODO",
    });

    res.status(201).json(task);
};

export const assignTask = async (req, res) => {
    const { taskId, workspaceId } = req.params;
    const { userId } = req.body;

    const taskCheck = await ensureTaskInWorkspace(taskId, workspaceId);
    if (!taskCheck.ok) {
        return res.status(taskCheck.status).json({ message: taskCheck.message });
    }
    const task = taskCheck.task;

    if (!userId) {
        task.assignedTo = [];
        await task.save();
        return res.json(task);
    }

    if (!task.assignedTo.some((id) => id.toString() === userId.toString())) {
        task.assignedTo.push(userId);
        await task.save();
    }

    io.to(userId.toString()).emit("task-assigned", {
        taskId: task._id,
        title: task.title,
        workspaceId,
    });

    await createActivityEvent({
        workspaceId,
        actorId: req.userId,
        type: "TASK_ASSIGNED",
        entityId: task._id,
        metadata: {
            userId,
        },
    });

    res.json(task);
};

export const getTasks = async (req, res) => {
    const { boardId, workspaceId } = req.params;

    const boardCheck = await ensureBoardInWorkspace(boardId, workspaceId);
    if (!boardCheck.ok) {
        return res.status(boardCheck.status).json({ message: boardCheck.message });
    }

    const tasks = await Task.find({
        boardId,
        archived: false,
    }).sort({createdAt: -1});

    res.json(tasks);
}

export const updateTask = async (req, res) => {
    const { taskId, workspaceId } = req.params;

    const taskCheck = await ensureTaskInWorkspace(taskId, workspaceId);
    if (!taskCheck.ok) {
        return res.status(taskCheck.status).json({ message: taskCheck.message });
    }
    const existingTask = taskCheck.task;

    const previousPriority = existingTask.priority;
    const previousStatus = existingTask.status || "TODO";

    const updatedTask = await Task.findByIdAndUpdate(
        taskId,
        req.body,
        { new: true}
    );

    if (
        req.body.priority &&
        req.body.priority !== previousPriority
    ) {
        await createActivityEvent({
            workspaceId,
            actorId: req.userId,
            type: "TASK_UPDATED",
            entityId: updatedTask._id,
            metadata: {
                from: previousPriority,
                to: updatedTask.priority,
            },
        });
    }
    if (
        req.body.status &&
        req.body.status !== previousStatus
    ) {
        await createActivityEvent({
            workspaceId,
            actorId: req.userId,
            type: "TASK_MOVED",
            entityId: updatedTask._id,
            metadata: {
                from: previousStatus,
                to: updatedTask.status,
            },
        });
    }

    res.json(updatedTask);
}

export const archiveTask = async (req, res) => {
    const { taskId, workspaceId } = req.params;

    const taskCheck = await ensureTaskInWorkspace(taskId, workspaceId);
    if (!taskCheck.ok) {
        return res.status(taskCheck.status).json({ message: taskCheck.message });
    }

    const task = await Task.findByIdAndUpdate(
        taskId,
        { archived: true },
        { new: true }
    );

    if(!task) {
        return res.status(404).json({message: "Task not found"})
    }

    await createActivityEvent({
        workspaceId,
        actorId: req.userId,
        type: "TASK_ARCHIVED",
        entityId: task._id,
        metadata: {
            title: task.title,
        },
    });

    res.json(task);
};


export const getComments = async (req, res) => {
  const { taskId, workspaceId } = req.params;
  const taskCheck = await ensureTaskInWorkspace(taskId, workspaceId);
  if (!taskCheck.ok) {
    return res.status(taskCheck.status).json({ message: taskCheck.message });
  }
  const comments = await Comment.find({ taskId })
    .sort({ createdAt: -1 })
    .populate("authorId", "name");
  res.json(comments);
};

export const createComment = async (req, res) => {
  const { taskId, workspaceId } = req.params;
  const { text } = req.body;

  const taskCheck = await ensureTaskInWorkspace(taskId, workspaceId);
  if (!taskCheck.ok) {
    return res.status(taskCheck.status).json({ message: taskCheck.message });
  }

  const comment = await Comment.create({
    taskId,
    authorId: req.userId,
    text,
  });

  try {
    const task = await Task.findById(taskId).select("title boardId");
    const workspace = await Workspace.findById(workspaceId).populate(
      "members.userId",
      "name email"
    );
    if (workspace) {
      const mentionTokens = Array.from(
        new Set(
          (text.match(/@([a-zA-Z0-9._-]+)/g) || []).map((m) =>
            m.slice(1).toLowerCase()
          )
        )
      );
      if (mentionTokens.length > 0) {
        const mentionedUsers = workspace.members
          .map((m) => m.userId)
          .filter(Boolean)
          .filter((u) => {
            const rawName = String(u.name || "").toLowerCase();
            const nameNoSpaces = rawName.replace(/\s+/g, "");
            const nameParts = rawName.split(/\s+/g).filter(Boolean);
            const emailLocal = String(u.email || "")
              .toLowerCase()
              .split("@")[0];

            return (
              mentionTokens.includes(nameNoSpaces) ||
              mentionTokens.includes(rawName) ||
              nameParts.some((p) => mentionTokens.includes(p)) ||
              (emailLocal && mentionTokens.includes(emailLocal))
            );
          })
          .filter((u) => u._id.toString() !== req.userId.toString());

        mentionedUsers.forEach((u) => {
          io.to(u._id.toString()).emit("mention", {
            taskId,
            workspaceId,
            taskTitle: task?.title || "Task",
            message: `${req.user?.name || "Someone"} mentioned you in a comment`,
          });
        });
      }
    }
  } catch (err) {
    console.error("MENTION PARSE ERROR:", err);
  }

  io.to(workspaceId.toString()).emit("comments-updated", { taskId });
  res.status(201).json(comment);
};

export const getTaskActivity = async (req, res) => {
  try {
    const { workspaceId, taskId } = req.params;
    const taskCheck = await ensureTaskInWorkspace(taskId, workspaceId);
    if (!taskCheck.ok) {
      return res.status(taskCheck.status).json({ message: taskCheck.message });
    }
    const events = await ActivityEvent.find({
      workspaceId,
      entityId: taskId,
    })
      .sort({ createdAt: -1 })
      .limit(50)
      .populate("actorId", "name email");

    res.json(events);
  } catch (err) {
    console.error("Task activity error:", err);
    res.status(500).json({ message: "Failed to fetch task activity" });
  }
};
