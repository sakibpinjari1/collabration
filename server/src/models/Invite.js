import mongoose from "mongoose";

const inviteSchema = new mongoose.Schema(
  {
    workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: "Workspace", required: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    role: { type: String, enum: ["MEMBER", "VIEWER"], default: "MEMBER" },
    status: { type: String, enum: ["PENDING", "ACCEPTED", "DECLINED"], default: "PENDING" },
    invitedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

inviteSchema.index({ workspaceId: 1, email: 1, status: 1 }, { unique: true });

export default mongoose.model("Invite", inviteSchema);
