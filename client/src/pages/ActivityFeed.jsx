import { useEffect, useState } from "react";
import api from "../api/axios";
import { useWorkspace } from "../state/WorkspaceContext";

function ActivityFeed() {
  const { activeWorkspaceId, activeWorkspace } = useWorkspace();

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
        setError("Failed to load activity");
        setEvents([]);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, [activeWorkspaceId]);

  /**
   * Temporary dev utility (kept intentionally)
   */
  const createTestTask = async () => {
    if (!activeWorkspaceId) return;

    try {
      const boardsRes = await api.get(
        `/workspaces/${activeWorkspaceId}/boards`
      );

      if (boardsRes.data.length === 0) {
        alert("No boards found. Create a board first.");
        return;
      }

      const boardId = boardsRes.data[0]._id;

      await api.post(
        `/workspaces/${activeWorkspaceId}/boards/${boardId}/tasks`,
        {
          title: "First Real Task",
          description: "Created from frontend",
          priority: "HIGH",
        }
      );

      // Refresh activity
      const activityRes = await api.get(
        `/workspaces/${activeWorkspaceId}/activity`
      );
      setEvents(activityRes.data || []);
    } catch (err) {
      console.error("CREATE TASK ERROR:", err.response || err);
    }
  };

  /**
   * Render states (intentional, not errors)
   */
  if (!activeWorkspaceId) {
    return <p>Select a workspace to view activity.</p>;
  }

  if (loading) return <p>Loading activity...</p>;
  if (error) return <p>{error}</p>;

  return (
    <div>
      <h2>Activity - {activeWorkspace?.name}</h2>

      <button onClick={createTestTask}>Create Test Task</button>

      {events.length === 0 && <p>No activity yet</p>}

      <ul>
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
