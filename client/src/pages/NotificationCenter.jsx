import { useEffect, useMemo, useState } from "react";
import { connectSocket, getSocket } from "../api/socket";
import { useAuth } from "../context/AuthContext";

function NotificationCenter() {
  const { token, user } = useAuth();
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
          message = `Task updated: ${event.metadata.from} → ${event.metadata.to}`;
        } else {
          message = "Task updated";
        }
      } else if (event.type === "TASK_MOVED") {
        message = `Task moved: ${event.metadata?.from || "?"} → ${
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

    socket.on("task-assigned", handleAssigned);
    socket.on("activity-event", handleActivity);
    return () => {
      socket.off("task-assigned", handleAssigned);
      socket.off("activity-event", handleActivity);
    };
  }, [token, user?._id]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setItems(parsed);
        }
      }
    } catch {
      // ignore storage errors
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(items));
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

  return (
    <div style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{ position: "relative" }}
      >
        Notifications
        {unreadCount > 0 && (
          <span
            style={{
              position: "absolute",
              top: "-6px",
              right: "-8px",
              background: "#e11d48",
              color: "white",
              borderRadius: "999px",
              fontSize: "11px",
              padding: "2px 6px",
            }}
          >
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            right: 0,
            top: "36px",
            width: "320px",
            background: "white",
            border: "1px solid #e6e6ef",
            borderRadius: "10px",
            boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
            padding: "10px",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "8px",
              gap: "8px",
            }}
          >
            <div style={{ fontWeight: 600 }}>Notifications</div>
            <div style={{ display: "flex", gap: "6px" }}>
              <button type="button" onClick={markAllRead}>
                Mark all read
              </button>
              <button type="button" onClick={clearAll}>
                Clear
              </button>
            </div>
          </div>
          <div style={{ display: "flex", gap: "6px", marginBottom: "8px" }}>
            {[
              { id: "ALL", label: "All" },
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
                style={{
                  padding: "4px 8px",
                  borderRadius: "6px",
                  border: "1px solid #e5e7eb",
                  background: filter === tab.id ? "#eef2ff" : "white",
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
          {filteredItems.length === 0 ? (
            <div style={{ color: "#6b7280" }}>No notifications yet.</div>
          ) : (
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {filteredItems.map((n) => (
                <li
                  key={n.id}
                  style={{
                    padding: "8px",
                    borderRadius: "8px",
                    background: n.read ? "#f9fafb" : "#eef2ff",
                    border: "1px solid #eef2f7",
                    marginBottom: "6px",
                  }}
                  onMouseEnter={() => markRead(n.id)}
                >
                  <div style={{ fontSize: "13px" }}>{n.message}</div>
                  <div style={{ fontSize: "11px", color: "#6b7280" }}>
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
