import { useEffect, useState } from "react";
import api from "../api/axios";
import { useWorkspace } from "../state/WorkspaceContext.jsx";
import { connectSocket, getSocket } from "../api/socket";
import { useAuth } from "../context/AuthContext";

function Boards() {
  const { activeWorkspaceId } = useWorkspace();
  const { token } = useAuth();
  const [boards, setBoards] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [newBoardName, setNewBoardName] = useState("");
  const [tasksByBoard, setTasksByBoard] = useState({});
  const [newTaskTitleByBoard, setNewTaskTitleByBoard] = useState({});
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [newTaskPriorityByBoard, setNewTaskPriorityByBoard] = useState({});
  const [members, setMembers] = useState([]);
  const columns = ["TODO", "DOING", "DONE"];
  const [selectedTask, setSelectedTask] = useState(null);
  const [modalData, setModalData] = useState({
    title: "",
    description: "",
    status: "TODO",
    priority: "MEDIUM",
    dueDate: "",
    assignedTo: "",
  });
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState("");

  

  useEffect(() => {
    if (!activeWorkspaceId) {
      setBoards([]);
      setTasksByBoard({});
      setMembers([]);
      return;
    }

    const fetchBoards = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await api.get(`/workspaces/${activeWorkspaceId}/boards`);
        setBoards(res.data || []);
      } catch (err) {
        if (err?.response?.status === 403) {
          setError("You don't have access to this workspace.");
        } else {
          setError("Failed to load boards");
        }
        setBoards([]);
      } finally {
        setLoading(false);
      }
    };

    fetchBoards();
  }, [activeWorkspaceId]);

  useEffect(() => {
    if (!activeWorkspaceId) {
      setMembers([]);
      return;
    }

    const fetchMembers = async () => {
      try {
        const res = await api.get(`/workspaces/${activeWorkspaceId}`);
        setMembers(res.data?.members || []);
      } catch (err) {
        if (err?.response?.status === 403) {
          setError("You don't have access to this workspace.");
        } else {
          setError("Failed to load members");
        }
      }
    };

    fetchMembers();
  }, [activeWorkspaceId]);

  const fetchTasksForBoards = async (currentBoards) => {
    if (!activeWorkspaceId || currentBoards.length === 0) {
      setTasksByBoard({});
      return;
    }

    try {
      const results = await Promise.all(
        currentBoards.map(async (board) => {
          const res = await api.get(
            `/workspaces/${activeWorkspaceId}/boards/${board._id}/tasks`,
          );
          return [board._id, res.data || []];
        }),
      );

      setTasksByBoard((prev) => {
        const next = { ...prev };
        for (const [boardId, tasks] of results) {
          next[boardId] = tasks;
        }
        return next;
      });
    } catch (err) {
      if (err?.response?.status === 403) {
        setError("You don't have access to this workspace.");
      } else {
        setError("Failed to load tasks");
      }
    }
  };

  useEffect(() => {
    if (!activeWorkspaceId || boards.length === 0) {
      setTasksByBoard({});
      return;
    }

    fetchTasksForBoards(boards);
  }, [activeWorkspaceId, boards]);

  useEffect(() => {
    let socket = getSocket();
    if (!socket && token) {
      socket = connectSocket(token);
    }
    if (!socket || !activeWorkspaceId) return;

    const joinRoom = () => {
      socket.emit("join-workspace", activeWorkspaceId);
    };

    if (socket.connected) {
      joinRoom();
    }
    socket.on("connect", joinRoom);

    const handleActivity = (event) => {
      if (
        !event?.workspaceId ||
        String(event.workspaceId) !== String(activeWorkspaceId)
      ) {
        return;
      }
      fetchTasksForBoards(boards);
    };

    socket.on("activity-event", handleActivity);

    return () => {
      socket.off("connect", joinRoom);
      socket.off("activity-event", handleActivity);
    };
  }, [activeWorkspaceId, token, boards]);

  const createBoard = async (e) => {
    e.preventDefault();
    if (!activeWorkspaceId || !newBoardName.trim()) return;

    try {
      const res = await api.post(`/workspaces/${activeWorkspaceId}/boards`, {
        name: newBoardName.trim(),
      });

      setBoards((prev) => [...prev, res.data]);
      setNewBoardName("");
    } catch (err) {
      setError("Failed to create board");
    }
  };

  const createTask = async (e, boardId) => {
    e.preventDefault();
    const title = newTaskTitleByBoard[boardId]?.trim();
    if (!activeWorkspaceId || !title) return;

    try {
      const res = await api.post(
        `/workspaces/${activeWorkspaceId}/boards/${boardId}/tasks`,
        {
          title,
          description: "",
          priority: newTaskPriorityByBoard[boardId] || "MEDIUM",
        },
      );

      setTasksByBoard((prev) => ({
        ...prev,
        [boardId]: [...(prev[boardId] || []), res.data],
      }));

      setNewTaskTitleByBoard((prev) => ({ ...prev, [boardId]: "" }));
    } catch (err) {
      setError("Failed to create task");
    }
  };

  const startEditTask = (task) => {
    setEditingTaskId(task._id);
    setEditingTitle(task.title || "");
  };

  const cancelEditTask = () => {
    setEditingTaskId(null);
    setEditingTitle("");
  };

  const saveTaskTitle = async (e, boardId, taskId) => {
    e.preventDefault();
    const title = editingTitle.trim();
    if (!activeWorkspaceId || !title) return;

    try {
      const res = await api.patch(
        `/workspaces/${activeWorkspaceId}/tasks/${taskId}`,
        { title },
      );

      setTasksByBoard((prev) => ({
        ...prev,
        [boardId]: (prev[boardId] || []).map((t) =>
          t._id === taskId ? res.data : t,
        ),
      }));
      cancelEditTask();
    } catch (err) {
      setError("Failed to update task");
    }
  };

  const archiveTask = async (boardId, taskId) => {
    if (!activeWorkspaceId) return;

    try {
      await api.delete(`/workspaces/${activeWorkspaceId}/tasks/${taskId}`);
      setTasksByBoard((prev) => ({
        ...prev,
        [boardId]: (prev[boardId] || []).filter((t) => t._id !== taskId),
      }));
    } catch (err) {
      setError("Failed to archive task");
    }
  };

  const updateTaskPriority = async (boardId, taskId, priority) => {
    if (!activeWorkspaceId) return;

    try {
      const res = await api.patch(
        `/workspaces/${activeWorkspaceId}/tasks/${taskId}`,
        { priority },
      );

      setTasksByBoard((prev) => ({
        ...prev,
        [boardId]: (prev[boardId] || []).map((t) =>
          t._id === taskId ? res.data : t,
        ),
      }));
    } catch (err) {
      setError("Failed to update priority");
    }
  };

  const updateTaskStatus = async (boardId, taskId, status) => {
    if (!activeWorkspaceId) return;

    try {
      const res = await api.patch(
        `/workspaces/${activeWorkspaceId}/tasks/${taskId}`,
        { status },
      );

      setTasksByBoard((prev) => ({
        ...prev,
        [boardId]: (prev[boardId] || []).map((t) =>
          t._id === taskId ? res.data : t,
        ),
      }));
    } catch (err) {
      setError("Failed to update status");
    }
  };

  const openTaskModal = (task) => {
    setSelectedTask(task);
    setModalData({
      title: task.title || "",
      description: task.description || "",
      status: task.status || "TODO",
      priority: task.priority || "MEDIUM",
      dueDate: task.dueDate ? task.dueDate.slice(0, 10) : "",
      assignedTo: task.assignedTo?.[0] || "",
    });
    setComments([]);
    setCommentText("");
  };

  const closeTaskModal = () => {
    setSelectedTask(null);
    setComments([]);
    setCommentText("");
  };

  const saveTaskModal = async () => {
    if (!selectedTask) return;

    try {
      const res = await api.patch(
        `/workspaces/${activeWorkspaceId}/tasks/${selectedTask._id}`,
        {
          ...modalData,
          assignedTo: modalData.assignedTo ? [modalData.assignedTo] : [],
        },
      );

      setTasksByBoard((prev) => ({
        ...prev,
        [selectedTask.boardId]: (prev[selectedTask.boardId] || []).map((t) =>
          t._id === selectedTask._id ? res.data : t,
        ),
      }));

      closeTaskModal();
    } catch (err) {
      setError("Failed to update task");
    }
  };

  const loadComments = async (taskId) => {
    if (!activeWorkspaceId || !taskId) return;
    try {
      const res = await api.get(
        `/workspaces/${activeWorkspaceId}/tasks/${taskId}/comments`,
      );
      setComments(res.data || []);
    } catch (err) {
      setError("Failed to load comments");
    }
  };

  const addComment = async () => {
    if (!activeWorkspaceId || !selectedTask || !commentText.trim()) return;
    try {
      const res = await api.post(
        `/workspaces/${activeWorkspaceId}/tasks/${selectedTask._id}/comments`,
        { text: commentText.trim() },
      );
      setComments((prev) => [res.data, ...prev]);
      setCommentText("");
    } catch (err) {
      setError("Failed to add comment");
    }
  };

  useEffect(() => {
    if (selectedTask?._id) {
      loadComments(selectedTask._id);
    }
  }, [selectedTask?._id]);

  const onDragStart = (e, taskId) => {
    e.dataTransfer.setData("taskId", taskId);
  };

  const onDropTask = async (e, boardId, status) => {
    const taskId = e.dataTransfer.getData("taskId");
    if (!taskId) return;
    await updateTaskStatus(boardId, taskId, status);
  };

  const assignTask = async (boardId, taskId, userId) => {
    if (!activeWorkspaceId) return;

    try {
      const res = await api.post(
        `/workspaces/${activeWorkspaceId}/tasks/${taskId}/assign`,
        { userId: userId || null },
      );

      setTasksByBoard((prev) => ({
        ...prev,
        [boardId]: (prev[boardId] || []).map((t) =>
          t._id === taskId ? res.data : t,
        ),
      }));
    } catch (err) {
      setError("Failed to assign task");
    }
  };

  if (!activeWorkspaceId) {
    return <p>Select a workspace to view boards.</p>;
  }

  if (loading) return <p>Loading boards...</p>;
  if (error) return <p>{error}</p>;

  return (
    <>
    <div className="card">
      <h2 className="section-title">Boards</h2>

      <form onSubmit={createBoard} className="form-row section">
        <input
          className="input"
          type="text"
          placeholder="New board name"
          value={newBoardName}
          onChange={(e) => setNewBoardName(e.target.value)}
        />
        <button className="button" type="submit">
          Create
        </button>
      </form>

      {boards.length === 0 && <p>No boards yet.</p>}

      <ul className="list-reset">
        {boards.map((board) => (
          <li key={board._id} className="card">
            <div className="section-title">{board.name}</div>

            <form onSubmit={(e) => createTask(e, board._id)} className="form-row">
              <input
                className="input"
                type="text"
                placeholder="New task title"
                value={newTaskTitleByBoard[board._id] || ""}
                onChange={(e) =>
                  setNewTaskTitleByBoard((prev) => ({
                    ...prev,
                    [board._id]: e.target.value,
                  }))
                }
              />
              <select
                className="select"
                value={newTaskPriorityByBoard[board._id] || "MEDIUM"}
                onChange={(e) =>
                  setNewTaskPriorityByBoard((prev) => ({
                    ...prev,
                    [board._id]: e.target.value,
                  }))
                }
              >
                <option value="LOW">LOW</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="HIGH">HIGH</option>
              </select>

              <button className="button" type="submit">
                Add Task
              </button>
            </form>

            {(tasksByBoard[board._id] || []).length === 0 ? (
              <p>No tasks yet.</p>
            ) : (
              <div className="kanban">
                {columns.map((col) => {
                  const tasks = (tasksByBoard[board._id] || []).filter(
                    (t) => (t.status || "TODO") === col,
                  );
                  return (
                    <div
                      key={col}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => onDropTask(e, board._id, col)}
                      className={`kanban-column ${col.toLowerCase()}`}
                    >
                      <h4 style={{ margin: "4px 0 8px 0" }}>
                        {col} ({tasks.length})
                      </h4>
                      <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                        {tasks.map((task) => (
                          <li
                            key={task._id}
                            className="task-card"
                          >
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                gap: "8px",
                              }}
                            >
                              <span
                                draggable
                                onDragStart={(e) => onDragStart(e, task._id)}
                                style={{
                                  cursor: "grab",
                                  padding: "0 6px",
                                  color: "#6b7280",
                                  userSelect: "none",
                                }}
                                title="Drag task"
                              >
                                ::
                              </span>
                              <span
                                style={{
                                  cursor: "pointer",
                                  textDecoration: "underline",
                                }}
                                onClick={() => openTaskModal(task)}
                              >
                                {task.title}
                              </span>
                              <select
                                value={task.status || "TODO"}
                                onChange={(e) =>
                                  updateTaskStatus(
                                    board._id,
                                    task._id,
                                    e.target.value,
                                  )
                                }
                                className="select"
                              >
                                <option value="TODO">TODO</option>
                                <option value="DOING">DOING</option>
                                <option value="DONE">DONE</option>
                              </select>
                              <select
                                value={task.priority || "MEDIUM"}
                                onChange={(e) =>
                                  updateTaskPriority(
                                    board._id,
                                    task._id,
                                    e.target.value,
                                  )
                                }
                                className="select"
                              >
                                <option value="LOW">LOW</option>
                                <option value="MEDIUM">MEDIUM</option>
                                <option value="HIGH">HIGH</option>
                              </select>
                            </div>

                            <div style={{ marginTop: "6px" }}>
                              <select
                                onChange={(e) =>
                                  assignTask(board._id, task._id, e.target.value)
                                }
                                defaultValue=""
                                className="select"
                              >
                                <option value="" disabled>
                                  Assign to...
                                </option>
                                <option value="">Unassign</option>
                                {members.map((m) => (
                                  <option
                                    key={m.userId?._id || m.userId}
                                    value={m.userId?._id || m.userId}
                                  >
                                    {m.userId?.name || "User"}
                                  </option>
                                ))}
                              </select>
                              {task.assignedTo && task.assignedTo.length > 0 && (
                                <div
                                  style={{
                                    marginTop: "6px",
                                    display: "flex",
                                    gap: "6px",
                                    flexWrap: "wrap",
                                  }}
                                >
                                  {task.assignedTo.map((id) => {
                                    const member = members.find(
                                      (m) =>
                                        String(m.userId?._id || m.userId) ===
                                        String(id),
                                    );
                                    return (
                                      <span
                                        key={id}
                                        style={{
                                          padding: "2px 8px",
                                          borderRadius: "999px",
                                          background: "#eef2ff",
                                          color: "#3730a3",
                                          fontSize: "12px",
                                          border: "1px solid #c7d2fe",
                                        }}
                                      >
                                        {member?.userId?.name || "User"}
                                      </span>
                                    );
                                  })}
                                </div>
                              )}
                            </div>

                            {editingTaskId === task._id ? (
                              <form
                                onSubmit={(e) =>
                                  saveTaskTitle(e, board._id, task._id)
                                }
                                style={{ marginTop: "6px" }}
                              >
                                <input
                                  type="text"
                                  value={editingTitle}
                                  onChange={(e) =>
                                    setEditingTitle(e.target.value)
                                  }
                                  style={{
                                    padding: "6px 8px",
                                    borderRadius: "8px",
                                    border: "1px solid #cfcfe3",
                                    minWidth: "200px",
                                  }}
                                />
                                <button
                                  type="submit"
                                  style={{
                                    marginLeft: "8px",
                                    padding: "6px 10px",
                                    borderRadius: "8px",
                                    border: "1px solid #2d6cdf",
                                    background: "#2d6cdf",
                                    color: "white",
                                    cursor: "pointer",
                                  }}
                                >
                                  Save
                                </button>
                                <button
                                  type="button"
                                  onClick={cancelEditTask}
                                  style={{
                                    marginLeft: "8px",
                                    padding: "6px 10px",
                                    borderRadius: "8px",
                                    border: "1px solid #b7b7c6",
                                    background: "white",
                                    cursor: "pointer",
                                  }}
                                >
                                  Cancel
                                </button>
                              </form>
                            ) : (
                              <div style={{ marginTop: "6px" }}>
                                <button
                                  type="button"
                                  onClick={() => startEditTask(task)}
                                  style={{
                                    padding: "4px 8px",
                                    borderRadius: "6px",
                                    border: "1px solid #b7b7c6",
                                    background: "white",
                                    cursor: "pointer",
                                    marginRight: "8px",
                                  }}
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    archiveTask(board._id, task._id)
                                  }
                                  style={{
                                    padding: "4px 8px",
                                    borderRadius: "6px",
                                    border: "1px solid #d64545",
                                    background: "#d64545",
                                    color: "white",
                                    cursor: "pointer",
                                  }}
                                >
                                  Archive
                                </button>
                              </div>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
    {selectedTask && (
      <div
        className="modal-overlay"
        onClick={closeTaskModal}
      >
        <div
          className="modal"
          onClick={(e) => e.stopPropagation()}
        >
          <h3>Edit Task</h3>

          <input
            className="input"
            type="text"
            value={modalData.title}
            onChange={(e) =>
              setModalData((prev) => ({ ...prev, title: e.target.value }))
            }
            style={{ width: "100%", marginBottom: "8px" }}
          />

          <textarea
            className="textarea"
            value={modalData.description}
            onChange={(e) =>
              setModalData((prev) => ({ ...prev, description: e.target.value }))
            }
            style={{ width: "100%", marginBottom: "8px" }}
          />

          <input
            className="input"
            type="date"
            value={modalData.dueDate}
            onChange={(e) =>
              setModalData((prev) => ({ ...prev, dueDate: e.target.value }))
            }
            style={{ width: "100%", marginBottom: "8px" }}
          />

          <select
            className="select"
            value={modalData.status}
            onChange={(e) =>
              setModalData((prev) => ({ ...prev, status: e.target.value }))
            }
          >
            <option value="TODO">TODO</option>
            <option value="DOING">DOING</option>
            <option value="DONE">DONE</option>
          </select>

          <select
            className="select"
            value={modalData.priority}
            onChange={(e) =>
              setModalData((prev) => ({ ...prev, priority: e.target.value }))
            }
            style={{ marginLeft: "8px" }}
          >
            <option value="LOW">LOW</option>
            <option value="MEDIUM">MEDIUM</option>
            <option value="HIGH">HIGH</option>
          </select>

          <select
            className="select"
            value={modalData.assignedTo}
            onChange={(e) =>
              setModalData((prev) => ({ ...prev, assignedTo: e.target.value }))
            }
            style={{ marginLeft: "8px" }}
          >
            <option value="">Unassigned</option>
            {members.map((m) => (
              <option
                key={m.userId?._id || m.userId}
                value={m.userId?._id || m.userId}
              >
                {m.userId?.name || "User"}
              </option>
            ))}
          </select>

          <div style={{ marginTop: "12px" }}>
            <button className="button" onClick={saveTaskModal}>Save</button>
            <button className="button secondary" onClick={closeTaskModal} style={{ marginLeft: "8px" }}>
              Cancel
            </button>
          </div>

          <div style={{ marginTop: "16px" }}>
            <h4 style={{ marginBottom: "6px" }}>Comments</h4>
            <textarea
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Write a comment..."
              style={{ width: "100%", marginBottom: "8px" }}
            />
            <button className="button" onClick={addComment}>Add Comment</button>

            {comments.length === 0 ? (
              <p style={{ marginTop: "8px" }}>No comments yet.</p>
            ) : (
              <ul style={{ listStyle: "none", padding: 0, marginTop: "8px" }}>
                {comments.map((c) => (
                  <li
                    key={c._id}
                    style={{
                      padding: "6px 8px",
                      borderRadius: "8px",
                      background: "#f9fafb",
                      border: "1px solid #eef2f7",
                      marginBottom: "6px",
                    }}
                  >
                    <div style={{ fontSize: "12px", color: "#6b7280" }}>
                      {c.authorId?.name || "User"}
                    </div>
                    <div>{c.text}</div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    )}
    </>
  );
}

export default Boards;
