import boardRoutes from "./routes/boardRoutes.js";
import express from "express";
import authRoutes from "./routes/authRoutes.js";
import workspaceRoutes from "./routes/workspaceRoutes.js";
import taskRoutes from "./routes/taskRoutes.js";
import activityRoutes from "./routes/activityRoutes.js";
import cors from "cors";

const app = express();

app.use(express.json());

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);
app.use("/api/auth", authRoutes);
app.use("/api/workspaces", boardRoutes);
app.use("/api/workspaces", workspaceRoutes);
app.use("/api/workspaces", taskRoutes);
app.use("/api/workspaces", activityRoutes);

app.use((req, res) => {
  console.log("UNMATCHED ROUTE:", req.method, req.originalUrl);
  res.status(404).json({ message: "Route not found" });
});

export default app;


