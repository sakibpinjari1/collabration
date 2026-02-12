import { useCallback, useEffect, useMemo, useState } from "react";
import api from "../api/axios";
import { useWorkspace } from "../state/WorkspaceContext.jsx";
import { connectSocket, getSocket } from "../api/socket";
import { useAuth } from "../context/AuthContext";

function Boards() {
  const { activeWorkspaceId } = useWorkspace();
  const { token, user } = useAuth();
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
    attachments: [],
  });
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState("");
  const [taskActivity, setTaskActivity] = useState([]);
  const [attachmentUrl, setAttachmentUrl] = useState("");
  const [attachmentLabel, setAttachmentLabel] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("ALL");
  const [assigneeFilter, setAssigneeFilter] = useState("ALL");
  const [dragOverBoardId, setDragOverBoardId] = useState(null);
  const [dragOverColumnKey, setDragOverColumnKey] = useState(null);

  const currentUserRole = useMemo(() => {
    if (!user?._id) return null;
    const me = members.find(
      (m) => String(m.userId?._id || m.userId) === String(user._id)
    );
    return me?.role || null;
  }, [members, user?._id]);

  const canEdit = currentUserRole && currentUserRole !== "VIEWER";

  const fetchBoards = useCallback(async () => {
    if (!activeWorkspaceId) {
      setBoards([]);
      setTasksByBoard({});
      setMembers([]);
      return;
    }

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
  }, [activeWorkspaceId]);

  useEffect(() => {
    fetchBoards();
  }, [fetchBoards]);

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
            `/workspaces/${activeWorkspaceId}/boards/${board._id}/tasks`
          );
          return [board._id, res.data || []];
        })
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
        }
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

  const reorderBoards = async (sourceId, targetId) => {
    if (!canEdit) return;
    const sourceIndex = boards.findIndex((b) => b._id === sourceId);
    const targetIndex = boards.findIndex((b) => b._id === targetId);
    if (sourceIndex === -1 || targetIndex === -1) return;
    if (sourceIndex === targetIndex) return;

    const next = [...boards];
    const [moved] = next.splice(sourceIndex, 1);
    next.splice(targetIndex, 0, moved);
    setBoards(next);

    try {
      await api.patch(`/workspaces/${activeWorkspaceId}/boards/reorder`, {
        orderedIds: next.map((b) => b._id),
      });
    } catch (err) {
      setError("Failed to reorder boards");
    }
  };

  const onBoardDragStart = (e, boardId) => {
    if (!canEdit) return;
    e.dataTransfer.setData("boardId", boardId);
  };

  const onBoardDrop = (e, targetBoardId) => {
    if (!canEdit) return;
    const sourceBoardId = e.dataTransfer.getData("boardId");
    if (!sourceBoardId) return;
    setDragOverBoardId(null);
    reorderBoards(sourceBoardId, targetBoardId);
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
        { title }
      );

      setTasksByBoard((prev) => ({
        ...prev,
        [boardId]: (prev[boardId] || []).map((t) =>
          t._id === taskId ? res.data : t
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
        { priority }
      );

      setTasksByBoard((prev) => ({
        ...prev,
        [boardId]: (prev[boardId] || []).map((t) =>
          t._id === taskId ? res.data : t
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
        { status }
      );

      setTasksByBoard((prev) => ({
        ...prev,
        [boardId]: (prev[boardId] || []).map((t) =>
          t._id === taskId ? res.data : t
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
      attachments: Array.isArray(task.attachments) ? task.attachments : [],
    });
    setComments([]);
    setCommentText("");
    setTaskActivity([]);
    setAttachmentUrl("");
    setAttachmentLabel("");
  };

  const closeTaskModal = () => {
    setSelectedTask(null);
    setComments([]);
    setCommentText("");
    setTaskActivity([]);
    setAttachmentUrl("");
    setAttachmentLabel("");
  };

  const saveTaskModal = async () => {
    if (!selectedTask) return;

    try {
      const res = await api.patch(
        `/workspaces/${activeWorkspaceId}/tasks/${selectedTask._id}`,
        {
          ...modalData,
          assignedTo: modalData.assignedTo ? [modalData.assignedTo] : [],
        }
      );

      setTasksByBoard((prev) => ({
        ...prev,
        [selectedTask.boardId]: (prev[selectedTask.boardId] || []).map((t) =>
          t._id === selectedTask._id ? res.data : t
        ),
      }));

      closeTaskModal();
    } catch (err) {
      setError("Failed to update task");
    }
  };

  const addAttachment = () => {
    if (!attachmentUrl.trim()) return;
    const next = [
      ...modalData.attachments,
      { url: attachmentUrl.trim(), label: attachmentLabel.trim() },
    ];
    setModalData((prev) => ({ ...prev, attachments: next }));
    setAttachmentUrl("");
    setAttachmentLabel("");
  };

  const removeAttachment = (url) => {
    setModalData((prev) => ({
      ...prev,
      attachments: (prev.attachments || []).filter((a) => a.url !== url),
    }));
  };

  const loadComments = useCallback(
    async (taskId) => {
      if (!activeWorkspaceId || !taskId) return;
      try {
        const res = await api.get(
          `/workspaces/${activeWorkspaceId}/tasks/${taskId}/comments`
        );
        setComments(res.data || []);
      } catch (err) {
        setError("Failed to load comments");
      }
    },
    [activeWorkspaceId]
  );

  const loadTaskActivity = useCallback(
    async (taskId) => {
      if (!activeWorkspaceId || !taskId) return;
      try {
        const res = await api.get(
          `/workspaces/${activeWorkspaceId}/tasks/${taskId}/activity`
        );
        setTaskActivity(res.data || []);
      } catch (err) {
        setError("Failed to load activity");
      }
    },
    [activeWorkspaceId]
  );

  const addComment = async () => {
    if (!activeWorkspaceId || !selectedTask || !commentText.trim()) return;
    try {
      const res = await api.post(
        `/workspaces/${activeWorkspaceId}/tasks/${selectedTask._id}/comments`,
        { text: commentText.trim() }
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
      loadTaskActivity(selectedTask._id);
    }
  }, [selectedTask?._id, loadComments, loadTaskActivity]);

  const onDragStart = (e, taskId) => {
    e.dataTransfer.setData("taskId", taskId);
  };

  const onDropTask = async (e, boardId, status) => {
    if (!canEdit) return;
    const taskId = e.dataTransfer.getData("taskId");
    if (!taskId) return;
    setDragOverColumnKey(null);
    await updateTaskStatus(boardId, taskId, status);
  };

  const assignTask = async (boardId, taskId, userId) => {
    if (!activeWorkspaceId) return;

    try {
      const res = await api.post(
        `/workspaces/${activeWorkspaceId}/tasks/${taskId}/assign`,
        { userId: userId || null }
      );

      setTasksByBoard((prev) => ({
        ...prev,
        [boardId]: (prev[boardId] || []).map((t) =>
          t._id === taskId ? res.data : t
        ),
      }));
    } catch (err) {
      setError("Failed to assign task");
    }
  };

  const tryOpenPendingTask = useCallback(() => {
    const pendingTaskId = sessionStorage.getItem("pendingOpenTaskId");
    const pendingWorkspaceId = sessionStorage.getItem("pendingOpenWorkspaceId");
    if (!pendingTaskId || !pendingWorkspaceId) return;
    if (!activeWorkspaceId || pendingWorkspaceId !== activeWorkspaceId) return;

    const allTasks = Object.values(tasksByBoard).flat();
    const match = allTasks.find((t) => String(t._id) === String(pendingTaskId));
    if (match) {
      openTaskModal(match);
      sessionStorage.removeItem("pendingOpenTaskId");
      sessionStorage.removeItem("pendingOpenWorkspaceId");
    }
  }, [activeWorkspaceId, tasksByBoard]);

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

      if (selectedTask?._id && String(event.entityId) === String(selectedTask._id)) {
        setTaskActivity((prev) => [event, ...prev].slice(0, 50));
      }
    };

    const handleBoardsUpdated = () => {
      fetchBoards();
    };

    const handleCommentsUpdated = (payload) => {
      if (!payload?.taskId || !selectedTask?._id) return;
      if (String(payload.taskId) !== String(selectedTask._id)) return;
      loadComments(selectedTask._id);
    };

    socket.on("activity-event", handleActivity);
    socket.on("boards-updated", handleBoardsUpdated);
    socket.on("comments-updated", handleCommentsUpdated);

    return () => {
      socket.off("connect", joinRoom);
      socket.off("activity-event", handleActivity);
      socket.off("boards-updated", handleBoardsUpdated);
      socket.off("comments-updated", handleCommentsUpdated);
    };
  }, [activeWorkspaceId, token, boards, fetchBoards, selectedTask?._id, loadComments]);

  useEffect(() => {
    tryOpenPendingTask();
  }, [tryOpenPendingTask, tasksByBoard, activeWorkspaceId]);

  useEffect(() => {
    const handleOpenTask = () => {
      tryOpenPendingTask();
    };
    window.addEventListener("open-task", handleOpenTask);
    return () => {
      window.removeEventListener("open-task", handleOpenTask);
    };
  }, [tryOpenPendingTask]);

  if (!activeWorkspaceId) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500">
        Select a workspace to view boards.
      </div>
    );
  }

  if (loading) return <p className="text-sm text-slate-500">Loading boards...</p>;
  if (error) return <p className="text-sm text-red-600">{error}</p>;

  const inputClass =
    "w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500";
  const selectClass =
    "rounded-xl border border-slate-300 bg-white px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500";
  const primaryButton =
    "inline-flex items-center justify-center rounded-xl bg-blue-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700";
  const secondaryButton =
    "inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50";
  const dangerButton =
    "inline-flex items-center justify-center rounded-xl bg-rose-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-rose-700";

  const columnClasses = {
    TODO: "bg-slate-50 border-slate-200",
    DOING: "bg-amber-50 border-amber-200",
    DONE: "bg-emerald-50 border-emerald-200",
  };

  const describeEvent = (event) => {
    if (!event?.type) return "Activity update";
    if (event.type === "TASK_CREATED") return `Created task`;
    if (event.type === "TASK_UPDATED") {
      if (event.metadata?.from && event.metadata?.to) {
        return `Updated priority ${event.metadata.from} -> ${event.metadata.to}`;
      }
      return "Updated task";
    }
    if (event.type === "TASK_MOVED") {
      return `Moved ${event.metadata?.from || ""} -> ${event.metadata?.to || ""}`;
    }
    if (event.type === "TASK_ASSIGNED") return "Assigned task";
    if (event.type === "TASK_ARCHIVED") return "Archived task";
    return "Activity update";
  };

  const getDueBadge = (task) => {
    if (!task?.dueDate) return null;
    if ((task.status || "TODO") === "DONE") return null;
    const due = new Date(task.dueDate);
    if (Number.isNaN(due.getTime())) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDay = new Date(due);
    dueDay.setHours(0, 0, 0, 0);
    const soon = new Date(today);
    soon.setDate(soon.getDate() + 3);

    if (dueDay < today) {
      return { label: "Overdue", className: "border-rose-200 bg-rose-50 text-rose-700" };
    }
    if (dueDay <= soon) {
      return { label: "Due soon", className: "border-amber-200 bg-amber-50 text-amber-700" };
    }
    return null;
  };

  return (
    <>
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Boards</h2>
          <span className="text-sm text-slate-500">{boards.length} boards</span>
        </div>

        {canEdit ? (
          <form onSubmit={createBoard} className="mt-4 flex flex-col sm:flex-row gap-3">
            <input
              className={inputClass}
              type="text"
              placeholder="New board name"
              value={newBoardName}
              onChange={(e) => setNewBoardName(e.target.value)}
            />
            <button className={primaryButton} type="submit">
              Create
            </button>
          </form>
        ) : (
          <p className="mt-4 text-sm text-slate-500">Read-only access</p>
        )}

        <div className="mt-4 flex flex-col lg:flex-row gap-3">
          <input
            className={inputClass}
            type="text"
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <select
            className={inputClass}
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
          >
            <option value="ALL">All priorities</option>
            <option value="LOW">LOW</option>
            <option value="MEDIUM">MEDIUM</option>
            <option value="HIGH">HIGH</option>
          </select>
          <select
            className={inputClass}
            value={assigneeFilter}
            onChange={(e) => setAssigneeFilter(e.target.value)}
          >
            <option value="ALL">All assignees</option>
            <option value="UNASSIGNED">Unassigned</option>
            {members.map((m) => (
              <option
                key={m.userId?._id || m.userId}
                value={m.userId?._id || m.userId}
              >
                {m.userId?.name || "User"}
              </option>
            ))}
          </select>
        </div>

        {boards.length === 0 && (
          <p className="mt-3 text-sm text-slate-500">No boards yet.</p>
        )}

        <ul className="mt-5 space-y-4">
          {boards.map((board) => (
            <li
              key={board._id}
              onDragOver={(e) => {
                if (!canEdit) return;
                e.preventDefault();
                setDragOverBoardId(board._id);
              }}
              onDragLeave={() => setDragOverBoardId(null)}
              onDrop={(e) => onBoardDrop(e, board._id)}
              className={`rounded-2xl border bg-white p-5 shadow-sm ${
                dragOverBoardId === board._id ? "border-blue-300 ring-2 ring-blue-200" : "border-slate-200"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {canEdit && (
                    <span
                      draggable
                      onDragStart={(e) => onBoardDragStart(e, board._id)}
                      className="cursor-grab select-none rounded-lg border border-slate-200 px-2 text-xs text-slate-500"
                      title="Drag board"
                    >
                      ::
                    </span>
                  )}
                  <div className="text-base font-semibold text-slate-900">{board.name}</div>
                </div>
                <span className="text-xs text-slate-500">
                  {(tasksByBoard[board._id] || []).length} tasks
                </span>
              </div>

              {canEdit ? (
                <form onSubmit={(e) => createTask(e, board._id)} className="mt-4 flex flex-col lg:flex-row gap-3">
                  <input
                    className={inputClass}
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
                    className={selectClass}
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

                  <button className={primaryButton} type="submit">
                    Add Task
                  </button>
                </form>
              ) : (
                <p className="mt-4 text-sm text-slate-500">Read-only access</p>
              )}

              {(tasksByBoard[board._id] || []).length === 0 ? (
                <p className="mt-3 text-sm text-slate-500">No tasks yet.</p>
              ) : (
                <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
                  {columns.map((col) => {
                    const tasks = (tasksByBoard[board._id] || []).filter(
                      (t) => (t.status || "TODO") === col
                    );
                    const filteredTasks = tasks.filter((t) => {
                      const titleMatch = (t.title || "")
                        .toLowerCase()
                        .includes(searchQuery.toLowerCase().trim());
                      if (!titleMatch) return false;

                      if (priorityFilter !== "ALL") {
                        if ((t.priority || "MEDIUM") !== priorityFilter) return false;
                      }

                      if (assigneeFilter !== "ALL") {
                        const assigned = t.assignedTo || [];
                        if (assigneeFilter === "UNASSIGNED") {
                          if (assigned.length > 0) return false;
                        } else if (!assigned.some((id) => String(id) === String(assigneeFilter))) {
                          return false;
                        }
                      }

                      return true;
                    });
                    return (
                      <div
                        key={col}
                        onDragOver={(e) => {
                          if (!canEdit) return;
                          e.preventDefault();
                          setDragOverColumnKey(`${board._id}-${col}`);
                        }}
                        onDragLeave={() => setDragOverColumnKey(null)}
                        onDrop={(e) => onDropTask(e, board._id, col)}
                        className={`rounded-2xl border p-3 min-h-[160px] ${
                          columnClasses[col] || "bg-slate-50 border-slate-200"
                        } ${
                          dragOverColumnKey === `${board._id}-${col}`
                            ? "ring-2 ring-blue-200 border-blue-300"
                            : ""
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-semibold text-slate-700">
                            {col}
                          </h4>
                          <span className="text-xs text-slate-500">
                            {filteredTasks.length}
                          </span>
                        </div>
                        <ul className="mt-3 space-y-2">
                          {filteredTasks.map((task) => (
                            <li key={task._id} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                              {(() => {
                                const badge = getDueBadge(task);
                                if (!badge) return null;
                                return (
                                  <div className="mb-2">
                                    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${badge.className}`}>
                                      {badge.label}
                                    </span>
                                  </div>
                                );
                              })()}
                              <div className="flex items-center gap-2">
                                <span
                                  draggable={canEdit}
                                  onDragStart={(e) => canEdit && onDragStart(e, task._id)}
                                  className="cursor-grab select-none rounded-lg border border-slate-200 px-2 text-xs text-slate-500"
                                  title="Drag task"
                                >
                                  ::
                                </span>
                                <button
                                  type="button"
                                  onClick={() => openTaskModal(task)}
                                  className="flex-1 text-left text-sm font-medium text-slate-900 hover:underline"
                                >
                                  {task.title}
                                </button>
                              </div>

                              <div className="mt-3 flex flex-wrap items-center gap-2">
                                <select
                                  value={task.status || "TODO"}
                                  onChange={(e) =>
                                    updateTaskStatus(
                                      board._id,
                                      task._id,
                                      e.target.value
                                    )
                                  }
                                  className={selectClass}
                                  disabled={!canEdit}
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
                                      e.target.value
                                    )
                                  }
                                  className={selectClass}
                                  disabled={!canEdit}
                                >
                                  <option value="LOW">LOW</option>
                                  <option value="MEDIUM">MEDIUM</option>
                                  <option value="HIGH">HIGH</option>
                                </select>
                              </div>

                              <div className="mt-3">
                                <select
                                  onChange={(e) =>
                                    assignTask(board._id, task._id, e.target.value)
                                  }
                                  defaultValue=""
                                  className={`${selectClass} w-full`}
                                  disabled={!canEdit}
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
                                  <div className="mt-2 flex flex-wrap gap-2">
                                    {task.assignedTo.map((id) => {
                                      const member = members.find(
                                        (m) =>
                                          String(m.userId?._id || m.userId) ===
                                          String(id)
                                      );
                                      return (
                                        <span
                                          key={id}
                                          className="inline-flex items-center rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-xs text-indigo-700"
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
                                  className="mt-3 flex flex-col sm:flex-row gap-2"
                                >
                                  <input
                                    type="text"
                                    value={editingTitle}
                                    onChange={(e) => setEditingTitle(e.target.value)}
                                    className={inputClass}
                                  />
                                  <button type="submit" className={primaryButton}>
                                    Save
                                  </button>
                                  <button
                                    type="button"
                                    onClick={cancelEditTask}
                                    className={secondaryButton}
                                  >
                                    Cancel
                                  </button>
                                </form>
                              ) : (
                                <div className="mt-3 flex flex-wrap items-center gap-2">
                                  {canEdit && (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() => startEditTask(task)}
                                        className={secondaryButton}
                                      >
                                        Edit
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => archiveTask(board._id, task._id)}
                                        className={dangerButton}
                                      >
                                        Archive
                                      </button>
                                    </>
                                  )}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={closeTaskModal}>
          <div
            className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Edit Task</h3>
              <button className={secondaryButton} onClick={closeTaskModal}>
                Close
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <input
                className={inputClass}
                type="text"
                value={modalData.title}
                onChange={(e) =>
                  setModalData((prev) => ({ ...prev, title: e.target.value }))
                }
                disabled={!canEdit}
              />

              <textarea
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500"
                rows={4}
                value={modalData.description}
                onChange={(e) =>
                  setModalData((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                disabled={!canEdit}
              />

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <input
                  className={inputClass}
                  type="date"
                  value={modalData.dueDate}
                  onChange={(e) =>
                    setModalData((prev) => ({
                      ...prev,
                      dueDate: e.target.value,
                    }))
                  }
                  disabled={!canEdit}
                />

                <select
                  className={selectClass}
                  value={modalData.status}
                  onChange={(e) =>
                    setModalData((prev) => ({ ...prev, status: e.target.value }))
                  }
                  disabled={!canEdit}
                >
                  <option value="TODO">TODO</option>
                  <option value="DOING">DOING</option>
                  <option value="DONE">DONE</option>
                </select>

                <select
                  className={selectClass}
                  value={modalData.priority}
                  onChange={(e) =>
                    setModalData((prev) => ({
                      ...prev,
                      priority: e.target.value,
                    }))
                  }
                  disabled={!canEdit}
                >
                  <option value="LOW">LOW</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="HIGH">HIGH</option>
                </select>
              </div>

              <select
                className={selectClass}
                value={modalData.assignedTo}
                onChange={(e) =>
                  setModalData((prev) => ({
                    ...prev,
                    assignedTo: e.target.value,
                  }))
                }
                disabled={!canEdit}
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

              <div className="flex items-center gap-2">
                {canEdit && (
                  <button className={primaryButton} onClick={saveTaskModal}>
                    Save
                  </button>
                )}
                <button className={secondaryButton} onClick={closeTaskModal}>
                  Close
                </button>
              </div>
            </div>

            <div className="mt-6">
              <h4 className="text-sm font-semibold text-slate-700">Attachments</h4>
              {modalData.attachments.length === 0 ? (
                <p className="mt-2 text-sm text-slate-500">No attachments yet.</p>
              ) : (
                <ul className="mt-2 space-y-2">
                  {modalData.attachments.map((a) => (
                    <li
                      key={a.url}
                      className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
                    >
                      <a
                        href={a.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm font-medium text-blue-700 hover:underline"
                      >
                        {a.label || a.url}
                      </a>
                      {canEdit && (
                        <button
                          type="button"
                          className="text-xs font-semibold text-rose-600 hover:text-rose-700"
                          onClick={() => removeAttachment(a.url)}
                        >
                          Remove
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}

              {canEdit && (
                <div className="mt-3 flex flex-col gap-2">
                  <input
                    className={inputClass}
                    type="url"
                    placeholder="Attachment URL"
                    value={attachmentUrl}
                    onChange={(e) => setAttachmentUrl(e.target.value)}
                  />
                  <input
                    className={inputClass}
                    type="text"
                    placeholder="Label (optional)"
                    value={attachmentLabel}
                    onChange={(e) => setAttachmentLabel(e.target.value)}
                  />
                  <button className={secondaryButton} type="button" onClick={addAttachment}>
                    Add Attachment
                  </button>
                </div>
              )}
            </div>

            <div className="mt-6">
              <h4 className="text-sm font-semibold text-slate-700">Activity</h4>
              {taskActivity.length === 0 ? (
                <p className="mt-2 text-sm text-slate-500">No activity yet.</p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {taskActivity.map((event) => (
                    <li
                      key={event._id}
                      className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
                    >
                      <div className="text-sm text-slate-700">
                        {describeEvent(event)}
                      </div>
                      <div className="text-xs text-slate-500">
                        {event.actorId?.name || "Someone"}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="mt-6">
              <h4 className="text-sm font-semibold text-slate-700">Comments</h4>
              {canEdit ? (
                <>
                  <textarea
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Write a comment..."
                    className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500"
                    rows={3}
                  />
                  <button className={`${primaryButton} mt-2`} onClick={addComment}>
                    Add Comment
                  </button>
                </>
              ) : (
                <p className="mt-2 text-sm text-slate-500">Read-only access</p>
              )}

              {comments.length === 0 ? (
                <p className="mt-2 text-sm text-slate-500">No comments yet.</p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {comments.map((c) => (
                    <li
                      key={c._id}
                      className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
                    >
                      <div className="text-xs text-slate-500">
                        {c.authorId?.name || "User"}
                      </div>
                      <div className="text-sm text-slate-700">{c.text}</div>
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

