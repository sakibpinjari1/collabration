import mongoose from "mongoose";
import Workspace from "./Workspace.js";

const activityEventSchema = new mongoose.Schema(
    {
        workspaceId: {
            type: mongoose.Schema.Types.ObjectId,
            ref:"Workspace",
            required: true,
            index: true,
        },

        actorId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

        type: {
            type: String,
            enum: [
                "TASK_CREATED",
                "TASK_UPDATED",
                "TASK_MOVED",
                "TASK_ASSIGNED",
                "TASK_ARCHIVED",
            ],
            required: true,
        },

        entityId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
        },
        metadata: {
            type: Object,
            default: {},
        },
    },
    {timestamps: true}
);

activityEventSchema.index({workspaceId: 1, createdAt: -1});

export default mongoose.model("ActivityEvent", activityEventSchema);
