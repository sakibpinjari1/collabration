import { useEffect, useMemo, useState } from "react";
import { useWorkspace } from "../state/WorkspaceContext.jsx";

function NotificationsPage() {
  const { selectWorkspace } = useWorkspace();
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState("ALL");
  const storageKey = "notifications";

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

  const tabs = [
    { id: "ALL", label: "All" },
    { id: "MENTION", label: "Mentions" },
    { id: "TASK_ASSIGNED", label: "Assignments" },
    { id: "TASK_CREATED", label: "Created" },
    { id: "TASK_UPDATED", label: "Updated" },
    { id: "TASK_MOVED", label: "Moved" },
    { id: "TASK_ARCHIVED", label: "Archived" },
  ];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold">Notifications</h3>
          <p className="text-sm text-slate-500">Full activity feed for you</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={markAllRead}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
          >
            Mark all read
          </button>
          <button
            type="button"
            onClick={clearAll}
            className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-100"
          >
            Clear
          </button>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setFilter(tab.id)}
            className={`rounded-lg border px-2.5 py-1 text-xs font-semibold transition ${
              filter === tab.id
                ? "border-blue-600 bg-blue-600 text-white"
                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {filteredItems.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">No notifications yet.</p>
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
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default NotificationsPage;

