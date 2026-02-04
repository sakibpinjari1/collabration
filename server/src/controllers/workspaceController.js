import Workspace from "../models/Workspace.js";

export const getUserWorkspaces = async (req, res) => {
    try {
        const userId = req.userId;
        console.log("🔍 Getting workspaces for user:", userId);
        
        const workspaces = await Workspace.find({
            "members.userId": userId
        });
        
        console.log("✅ Found", workspaces.length, "workspaces");
        res.json(workspaces);
    } catch (err) {
        console.error("❌ Error getting workspaces:", err);
        res.status(500).json({ message: "Error fetching workspaces" });
    }
};

export const createWorkspace = async (req, res) => {
    const { name } = req.body;

    const workspace = await Workspace.create({
        name,
        ownerId: req.userId,
        members: [{
            userId: req.userId, role: "OWNER"
        }],
    })

    res.status(201).json(workspace);
};