import mongoose from "mongoose";

const workspaceMemberSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        role:{
            type: String,
            enum: ["OWNER", "MEMBER", "VIEWER"],
            required: true,
        },
    },
    {_id: false}
);

const workspaceSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },
        ownerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        members: {
            type: [workspaceMemberSchema],
            default: [],
        },
    },
    { timestamps: true }
);

workspaceSchema.index({"members.userId": 1})

export default mongoose.model("Workspace", workspaceSchema);
