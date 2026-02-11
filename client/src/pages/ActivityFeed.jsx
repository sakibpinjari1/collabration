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

  /**
   * Fetch activity when active workspace changes
   */
  useEffect(() => {
    if (!activeWorkspaceId) {
      setEvents([]);
      return;
    }

    const fetchEvents = async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await api.get(
          `/workspaces/${activeWorkspaceId}/activity`
        );
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


  /**
   * Render states (intentional, not errors)
   */
  if (!activeWorkspaceId) {
    return <p>Select a workspace to view activity.</p>;
  }

  if (loading) return <p>Loading activity...</p>;
  if (error) return <p>{error}</p>;

  return (
    <div className="card" style={{ marginTop: "16px" }}>
      <h2>Activity - {activeWorkspace?.name}</h2>

      {events.length === 0 && <p>No activity yet</p>}

      <ul className="list-reset">
        {events.map((event) => (
          <li key={event._id}>
            <strong>{event.type}</strong> - {event.actorId?.name || "Someone"}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default ActivityFeed;
