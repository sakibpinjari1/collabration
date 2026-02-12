import { useEffect, useMemo, useState } from "react";
import api from "../api/axios";
import { useWorkspace } from "../state/WorkspaceContext.jsx";
import { useAuth } from "../context/AuthContext";
import { connectSocket, getSocket } from "../api/socket";

function WorkspaceMembers() {
  const { activeWorkspaceId } = useWorkspace();
  const { user, token } = useAuth();
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

  useEffect(() => {
    let socket = getSocket();
    if (!socket && token) {
      socket = connectSocket(token);
    }
    if (!socket || !activeWorkspaceId) return;

    const handleMembersUpdated = () => {
      fetchMembers();
    };

    socket.on("members-updated", handleMembersUpdated);
    return () => {
      socket.off("members-updated", handleMembersUpdated);
    };
  }, [activeWorkspaceId, token]);

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
      await api.patch(`/workspaces/${activeWorkspaceId}/members/${memberId}`, {
        role,
      });
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
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500">
        Select a workspace to view members.
      </div>
    );
  }

  if (loading) return <p className="text-sm text-slate-500">Loading members...</p>;
  if (error) return <p className="text-sm text-red-600">{error}</p>;

  const selectClass =
    "rounded-xl border border-slate-300 bg-white px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500";
  const secondaryButton =
    "inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50";

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Members</h3>
        <span className="text-sm text-slate-500">{members.length}</span>
      </div>
      {members.length === 0 && (
        <p className="mt-3 text-sm text-slate-500">No members yet.</p>
      )}
      <ul className="mt-4 space-y-2">
        {members.map((m) => {
          const memberId = m.userId?._id || m.userId;
          const isSelf = user?._id && String(memberId) === String(user._id);
          return (
            <li
              key={memberId}
              className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
            >
              <span className="text-sm text-slate-700">
                <span className="font-medium text-slate-900">
                  {m.userId?.name || "User"}
                </span>
                <span className="text-slate-500"> · {m.role}</span>
                {isSelf ? " (You)" : ""}
              </span>
              {currentUserRole === "OWNER" && !isSelf && (
                <div className="flex items-center gap-2">
                  <select
                    className={selectClass}
                    value={m.role}
                    onChange={(e) => updateMemberRole(memberId, e.target.value)}
                  >
                    <option value="MEMBER">MEMBER</option>
                    <option value="VIEWER">VIEWER</option>
                  </select>
                  <button
                    className={secondaryButton}
                    type="button"
                    onClick={() => removeMember(memberId)}
                  >
                    Remove
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default WorkspaceMembers;

