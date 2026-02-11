import { useEffect, useMemo, useState } from "react";
import api from "../api/axios";
import { useWorkspace } from "../state/WorkspaceContext.jsx";
import { useAuth } from "../context/AuthContext";

function WorkspaceMembers() {
  const { activeWorkspaceId } = useWorkspace();
  const { user } = useAuth();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchMembers = async () => {
    if (!activeWorkspaceId) {
      setMembers([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const res = await api.get(`/workspaces/${activeWorkspaceId}`);
      const list = res.data?.members || [];
      setMembers(list);
    } catch (err) {
      if (err?.response?.status === 403) {
        setError("You don't have access to this workspace.");
      } else {
        setError("Failed to load members");
      }
      setMembers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!activeWorkspaceId) {
      setMembers([]);
      return;
    }

    fetchMembers();
  }, [activeWorkspaceId]);

  const currentUserRole = useMemo(() => {
    if (!user?._id) return null;
    const me = members.find(
      (m) => String(m.userId?._id || m.userId) === String(user._id)
    );
    return me?.role || null;
  }, [members, user?._id]);

  const updateMemberRole = async (memberId, role) => {
    if (!activeWorkspaceId) return;
    try {
      await api.patch(
        `/workspaces/${activeWorkspaceId}/members/${memberId}`,
        { role }
      );
      fetchMembers();
    } catch (err) {
      setError("Failed to update role");
    }
  };

  const removeMember = async (memberId) => {
    if (!activeWorkspaceId) return;
    try {
      await api.delete(`/workspaces/${activeWorkspaceId}/members/${memberId}`);
      fetchMembers();
    } catch (err) {
      setError("Failed to remove member");
    }
  };

  if (!activeWorkspaceId) {
    return <p>Select a workspace to view members.</p>;
  }

  if (loading) return <p>Loading members...</p>;
  if (error) return <p>{error}</p>;

  return (
    <div className="card" style={{ margin: "16px 0" }}>
      <h3>Members</h3>
      {members.length === 0 && <p>No members yet.</p>}
      <ul className="list-reset">
        {members.map((m) => {
          const memberId = m.userId?._id || m.userId;
          const isSelf = user?._id && String(memberId) === String(user._id);
          return (
            <li
              key={memberId}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                marginBottom: "6px",
              }}
            >
              <span>
                {m.userId?.name || "User"} - {m.role}
                {isSelf ? " (You)" : ""}
              </span>
              {currentUserRole === "OWNER" && !isSelf && (
                <>
                  <select
                    className="select"
                    value={m.role}
                    onChange={(e) =>
                      updateMemberRole(memberId, e.target.value)
                    }
                    style={{ marginLeft: "8px" }}
                  >
                    <option value="MEMBER">MEMBER</option>
                    <option value="VIEWER">VIEWER</option>
                  </select>
                  <button
                    className="button secondary"
                    type="button"
                    onClick={() => removeMember(memberId)}
                    style={{ marginLeft: "8px" }}
                  >
                    Remove
                  </button>
                </>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default WorkspaceMembers;
