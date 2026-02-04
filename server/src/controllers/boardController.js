import { requireWorkspaceMember } from "../middleware/workspaceMiddleware.js";
import Board from "../models/Board.js";

export const createBoard = async(req, res) => {
    const { name } = req.body;
    const { workspaceId } = req.params;


    const boardCount = await Board.countDocuments({ workspaceId });

    const board = await Board.create ({
        name,
        workspaceId,
        order: boardCount,
    });

    res.status(201).json(board);

};

export const getBoards = async(req, res) => {
    const { workspaceId } = req.params;

    const boards = await Board.find({ workspaceId}).sort({ order: 1});

    res.json(boards);
};