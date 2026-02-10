import http from "http";
import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import app from "./src/app.js";
import Workspace from "./src/models/Workspace.js";
import connectDB from "./src/config/db.js";

dotenv.config();

connectDB();

const server = http.createServer(app);

export const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

/**
 *  Socket authentication (JWT)
 */
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;

  if (!token) {
    return next(new Error("Authentication token missing"));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.userId;
    next();
  } catch (err) {
    next(new Error("Invalid or expired token"));
  }
});

io.on("connection", (socket) => {
  console.log("Authenticated socket connected:", socket.userId);

  socket.join(socket.userId.toString());

  /**
   * Secure workspace room joining
   */
  socket.on("join-workspace", async (workspaceId) => {
    if (!workspaceId) return;

    try {
      const workspace = await Workspace.findById(workspaceId);

      if (!workspace) {
        socket.emit("join-error", "Workspace not found");
        return;
      }

      const isMember = workspace.members.some(
        (member) => member.userId.toString() === socket.userId
      );

      if (!isMember) {
        socket.emit("join-error", "Access denied to workspace");
        return;
      }

      //  Authorized: join room
      socket.join(workspaceId);
      socket.emit("join-success", workspaceId);

      console.log(
        `User ${socket.userId} joined workspace room ${workspaceId}`
      );
    } catch (err) {
      socket.emit("join-error", "Failed to join workspace");
    }
  });

  socket.on("disconnect", () => {
    console.log("Socket disconnected:", socket.userId);
  });
});

const PORT = 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

