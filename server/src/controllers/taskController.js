import { requireRole, requireWorkspaceMember } from "../middleware/workspaceMiddleware.js";
import Task from "../models/Task.js";
import createActivityEvent from "../utils/createActivityEvent.js";
import { io } from "../../server.js";

export const createTask = async(req, res) => {
    const { title, description, priority } = req.body;
    const { boardId, workspaceId } = req.params;

    
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

    const task = await Task.findById(taskId);
    if (!task) {
        return res.status(404).json({ message: "Task not found"});
    }

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
    const { boardId } = req.params;

    const tasks = await Task.find({
        boardId,
        archived: false,
    }).sort({createdAt: -1});

    res.json(tasks);
}

export const updateTask = async (req, res) => {
    const { taskId, workspaceId } = req.params;

    const existingTask = await Task.findById(taskId);
    if (!existingTask) {
        return res.status(404).json({ message: "Task not found"});

    }

    const previousPriority = existingTask.priority;

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

    res.json(updatedTask);
}

export const archiveTask = async (req, res) => {
    const { taskId, workspaceId } = req.params;

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


