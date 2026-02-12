import { requireWorkspaceMember } from "../middleware/workspaceMiddleware.js";
import Board from "../models/Board.js";
import { io } from "../../server.js";

export const createBoard = async(req, res) => {
    const { name } = req.body;
    const { workspaceId } = req.params;


    const boardCount = await Board.countDocuments({ workspaceId });

    const board = await Board.create ({
        name,
        workspaceId,
        order: boardCount,
    });

    io.to(workspaceId.toString()).emit("boards-updated");
    res.status(201).json(board);

};

export const getBoards = async(req, res) => {
    const { workspaceId } = req.params;

    const boards = await Board.find({ workspaceId}).sort({ order: 1});

    res.json(boards);
};

export const reorderBoards = async (req, res) => {
    const { workspaceId } = req.params;
    const { orderedIds } = req.body;

    if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
        return res.status(400).json({ message: "orderedIds required" });
    }

    const bulk = orderedIds.map((id, index) => ({
        updateOne: {
            filter: { _id: id, workspaceId },
            update: { $set: { order: index } },
        },
    }));

    await Board.bulkWrite(bulk);
    io.to(workspaceId.toString()).emit("boards-updated");
    res.json({ message: "Boards reordered" });
};
