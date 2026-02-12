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

export const exportActivityCsv = async (req, res) => {
    try {
        const { workspaceId } = req.params;

        const events = await ActivityEvent.find({ workspaceId })
            .sort({ createdAt: -1 })
            .limit(500)
            .populate("actorId", "name email");

        const header = ["createdAt", "type", "actor", "entityId", "metadata"].join(",");
        const rows = events.map((e) => {
            const actor = e.actorId?.name || e.actorId?.email || "Unknown";
            const meta = JSON.stringify(e.metadata || {}).replace(/"/g, '""');
            return [
                new Date(e.createdAt).toISOString(),
                e.type,
                actor,
                e.entityId?.toString() || "",
                `"${meta}"`,
            ].join(",");
        });

        const csv = [header, ...rows].join("\n");
        res.setHeader("Content-Type", "text/csv");
        res.setHeader(
            "Content-Disposition",
            `attachment; filename=\"activity-${workspaceId}.csv\"`
        );
        res.send(csv);
    } catch (err) {
        console.error("Activity export error:", err);
        res.status(500).json({ message: "Failed to export activity" });
    }
};


