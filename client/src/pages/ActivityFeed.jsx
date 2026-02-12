import { useEffect, useState } from "react";
import api from "../api/axios";
import { useWorkspace } from "../state/WorkspaceContext.jsx";
import { connectSocket, getSocket } from "../api/socket";
import { useAuth } from "../context/AuthContext";

function ActivityFeed() {
  const { activeWorkspaceId, activeWorkspace } = useWorkspace();
  const { token } = useAuth();

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (!activeWorkspaceId) {
      setEvents([]);
      return;
    }

    const fetchEvents = async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await api.get(`/workspaces/${activeWorkspaceId}/activity`);
        setEvents(res.data || []);
      } catch (err) {
        if (err?.response?.status === 403) {
          setError("You don't have access to this workspace.");
        } else {
          setError("Failed to load activity");
        }
        setEvents([]);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, [activeWorkspaceId]);

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
      setEvents((prev) => [event, ...prev]);
    };

    socket.on("activity-event", handleActivity);

    return () => {
      socket.off("connect", joinRoom);
      socket.off("activity-event", handleActivity);
    };
  }, [activeWorkspaceId, token]);

  if (!activeWorkspaceId) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500">
        Select a workspace to view activity.
      </div>
    );
  }

  if (loading) return <p className="text-sm text-slate-500">Loading activity...</p>;
  if (error) return <p className="text-sm text-red-600">{error}</p>;

  const exportCsv = async () => {
    if (!activeWorkspaceId) return;
    try {
      setExporting(true);
      const res = await api.get(`/workspaces/${activeWorkspaceId}/activity/export`, {
        responseType: "blob",
      });
      const blob = new Blob([res.data], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `activity-${activeWorkspaceId}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError("Failed to export activity");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Activity</h2>
          <span className="text-sm text-slate-500">{activeWorkspace?.name}</span>
        </div>
        <button
          type="button"
          onClick={exportCsv}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
          disabled={exporting}
        >
          {exporting ? "Exporting..." : "Export CSV"}
        </button>
      </div>

      {events.length === 0 && (
        <p className="mt-3 text-sm text-slate-500">No activity yet.</p>
      )}

      <ul className="mt-4 space-y-2">
        {events.map((event) => (
          <li
            key={event._id}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700"
          >
            <span className="font-semibold text-slate-900">{event.type}</span>
            <span className="text-slate-500"> · </span>
            {event.actorId?.name || "Someone"}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default ActivityFeed;

