import ActivityEvent from "../models/ActivityEvent.js";
import { io } from "../../server.js";

const createActivityEvent = async ({
    workspaceId,
    actorId,
    type,
    entityId,
    metadata = {},

}) => {
    const event = await ActivityEvent.create({
        workspaceId,
        actorId,
        type,
        entityId,
        metadata,
    });

    io.to(workspaceId.toString()).emit("activity-event", event);
};

export default createActivityEvent;