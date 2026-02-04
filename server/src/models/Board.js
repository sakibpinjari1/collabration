import mongoose from "mongoose";
const boardSchema = new mongoose.Schema(
    {
        workspaceId: {
            type: mongoose.Schema.Types.ObjectId,
            ref:"Workspace",
            required: true,
            index: true
        },
         
        name: {
            type: String,
            required: true,
            trim: true,
        },

        order: {
            type: Number,
            required: true,
        },
    },
    { timestamps: true } 
);

export default mongoose.model("Board", boardSchema);