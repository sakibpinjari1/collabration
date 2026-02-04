import ActivityEvent from "../models/ActivityEvent.js";

export const getActivityFeed = async (req, res) => {
    try {
        const { workspaceId } = req.params;

        const events = await ActivityEvent.find({ workspaceId })
            .sort({ createdAt: -1 })
            .limit(50)
            .populate("actorId", "name email");

        res.json(events);
    } catch (err) {
        console.error("Activity feed error:", err);
        res.status(500).json({ message: "Failed to fetch activity feed" });
    }
};


