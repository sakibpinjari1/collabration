import { requireRole, requireWorkspaceMember } from "../middleware/workspaceMiddleware.js";
import Task from "../models/Task.js";
import createActivityEvent from "../utils/createActivityEvent.js";

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

    });

    res.status(201).json(task);
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

    const previousStatus = existingTask.status;

    const updatedTask = await Task.findByIdAndUpdate(
        taskId,
        req.body,
        { new: true}
    );

    if(
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
