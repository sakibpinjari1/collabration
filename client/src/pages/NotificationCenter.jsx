import { useEffect, useMemo, useState } from "react";
import { connectSocket, getSocket } from "../api/socket";
import { useAuth } from "../context/AuthContext";
import { useWorkspace } from "../state/WorkspaceContext.jsx";

function NotificationCenter() {
  const { token, user } = useAuth();
  const { selectWorkspace } = useWorkspace();
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("ALL");
  const storageKey = "notifications";

  const formatTimeAgo = (iso) => {
    if (!iso) return "";
    const diffMs = Date.now() - new Date(iso).getTime();
    if (Number.isNaN(diffMs)) return "";
    const seconds = Math.floor(diffMs / 1000);
    if (seconds < 60) return "just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  useEffect(() => {
    let socket = getSocket();
    if (!socket && token) {
      socket = connectSocket(token);
    }
    if (!socket) return;

    const handleAssigned = (payload) => {
      if (!payload?.title) return;
      const item = {
        id: `${payload.taskId}-${Date.now()}`,
        type: "TASK_ASSIGNED",
        message: `You were assigned: ${payload.title}`,
        createdAt: new Date().toISOString(),
        read: false,
      };
      setItems((prev) => [item, ...prev].slice(0, 50));
    };

    const handleActivity = (event) => {
      if (!event?.type) return;

      if (
        event.type === "TASK_ASSIGNED" &&
        event.metadata?.userId &&
        user?._id &&
        String(event.metadata.userId) === String(user._id)
      ) {
        return;
      }

      let message = "Activity update";
      if (event.type === "TASK_CREATED") {
        message = `Task created: ${event.metadata?.title || "Untitled"}`;
      } else if (event.type === "TASK_UPDATED") {
        if (event.metadata?.from && event.metadata?.to) {
          message = `Task updated: ${event.metadata.from} -> ${event.metadata.to}`;
        } else {
          message = "Task updated";
        }
      } else if (event.type === "TASK_MOVED") {
        message = `Task moved: ${event.metadata?.from || "?"} -> ${
          event.metadata?.to || "?"
        }`;
      } else if (event.type === "TASK_ARCHIVED") {
        message = `Task archived: ${event.metadata?.title || "Untitled"}`;
      } else if (event.type === "TASK_ASSIGNED") {
        message = "Task assigned";
      }

      const item = {
        id: `${event._id || event.entityId}-${Date.now()}`,
        type: event.type,
        message,
        createdAt: event.createdAt || new Date().toISOString(),
        read: false,
      };
      setItems((prev) => [item, ...prev].slice(0, 50));
    };

    const handleMention = (payload) => {
      const item = {
        id: `mention-${Date.now()}`,
        type: "MENTION",
        message: payload?.message || "You were mentioned in a comment",
        workspaceId: payload?.workspaceId,
        taskId: payload?.taskId,
        taskTitle: payload?.taskTitle,
        createdAt: new Date().toISOString(),
        read: false,
      };
      setItems((prev) => [item, ...prev].slice(0, 50));
    };

    socket.on("task-assigned", handleAssigned);
    socket.on("activity-event", handleActivity);
    socket.on("mention", handleMention);
    return () => {
      socket.off("task-assigned", handleAssigned);
      socket.off("activity-event", handleActivity);
      socket.off("mention", handleMention);
    };
  }, [token, user?._id]);

  const loadFromStorage = () => {
    try {
      const raw = sessionStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setItems(parsed);
        }
      }
    } catch {
      // ignore storage errors
    }
  };

  useEffect(() => {
    loadFromStorage();
  }, []);

  useEffect(() => {
    const handleUpdate = () => {
      loadFromStorage();
    };
    window.addEventListener("notifications-updated", handleUpdate);
    return () => {
      window.removeEventListener("notifications-updated", handleUpdate);
    };
  }, []);

  useEffect(() => {
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(items));
      window.dispatchEvent(new Event("notifications-updated"));
    } catch {
      // ignore storage errors
    }
  }, [items]);

  const unreadCount = useMemo(
    () => items.filter((n) => !n.read).length,
    [items]
  );

  const filteredItems = useMemo(() => {
    if (filter === "ALL") return items;
    return items.filter((n) => n.type === filter);
  }, [items, filter]);

  const markAllRead = () => {
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const clearAll = () => {
    setItems([]);
  };

  const markRead = (id) => {
    setItems((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const goToTask = (item) => {
    if (!item?.workspaceId || !item?.taskId) return;
    selectWorkspace(item.workspaceId);
      sessionStorage.setItem("pendingOpenTaskId", item.taskId);
      sessionStorage.setItem("pendingOpenWorkspaceId", item.workspaceId);
      window.dispatchEvent(new Event("open-task"));
  };

  const triggerButton =
    "relative inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50";
  const tabButton = (active) =>
    `rounded-lg border px-2.5 py-1 text-xs font-semibold transition ${
      active
        ? "border-blue-600 bg-blue-600 text-white"
        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
    }`;

  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen((v) => !v)} className={triggerButton}>
        Notifications
        {unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-2 rounded-full bg-rose-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-12 w-80 rounded-2xl border border-slate-200 bg-white p-4 shadow-lg">
          <div className="flex items-center justify-between gap-2">
            <div className="text-sm font-semibold text-slate-800">Notifications</div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={markAllRead}
                className="text-xs font-semibold text-slate-600 hover:text-slate-900"
              >
                Mark all read
              </button>
              <button
                type="button"
                onClick={clearAll}
                className="text-xs font-semibold text-rose-600 hover:text-rose-700"
              >
                Clear
              </button>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {[
              { id: "ALL", label: "All" },
              { id: "MENTION", label: "Mentions" },
              { id: "TASK_ASSIGNED", label: "Assignments" },
              { id: "TASK_CREATED", label: "Created" },
              { id: "TASK_UPDATED", label: "Updated" },
              { id: "TASK_MOVED", label: "Moved" },
              { id: "TASK_ARCHIVED", label: "Archived" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilter(tab.id)}
                className={tabButton(filter === tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>
          {filteredItems.length === 0 ? (
            <div className="mt-4 text-sm text-slate-500">No notifications yet.</div>
          ) : (
            <ul className="mt-4 space-y-2">
              {filteredItems.map((n) => (
                <li
                  key={n.id}
                  className={`rounded-xl border px-3 py-2 text-sm transition ${
                    n.read
                      ? "border-slate-200 bg-slate-50 text-slate-600"
                      : "border-blue-200 bg-blue-50 text-slate-800"
                  }`}
                  onMouseEnter={() => markRead(n.id)}
                >
                  <div className="text-sm font-medium">{n.message}</div>
                  {n.type === "MENTION" && (
                    <div className="mt-1 flex items-center justify-between gap-2">
                      <span className="text-xs text-slate-500">
                        {n.taskTitle || "Task"}
                      </span>
                      <button
                        type="button"
                        className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-50"
                        onClick={() => goToTask(n)}
                      >
                        View task
                      </button>
                    </div>
                  )}
                  <div className="text-xs text-slate-500">
                    {formatTimeAgo(n.createdAt)}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

export default NotificationCenter;


