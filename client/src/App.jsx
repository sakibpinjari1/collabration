import { useEffect, useState } from "react";
import api from "./api/axios";
import { useAuth } from "./context/AuthContext";
import { useWorkspace } from "./state/WorkspaceContext.jsx";
import ActivityFeed from "./pages/ActivityFeed";
import Boards from "./pages/Boards";
import Login from "./pages/Login";
import WorkspaceMembers from "./pages/WorkspaceMembers";
import { connectSocket, getSocket } from "./api/socket";
import NotificationCenter from "./pages/NotificationCenter";
import Invites from "./Invite";
import Dashboard from "./pages/Dashboard";

function App() {
  const { user, loading: authLoading, logout, token } = useAuth();
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("MEMBER");
  const [inviteError, setInviteError] = useState("");
  
  const {
    workspaces,
    activeWorkspaceId,
    selectWorkspace,
    activeWorkspace,
    loading: workspaceLoading,
    addWorkspace,
  } = useWorkspace();
  const [newWorkspaceName, setNewWorkspaceName] = useState("");

  const createWorkspace = async (e) => {
    e.preventDefault();
    if (!newWorkspaceName.trim()) return;

    const res = await api.post("/workspaces", { name: newWorkspaceName.trim() });
    addWorkspace(res.data);
    setNewWorkspaceName("");
  };

  const sendInvite = async (e) => {
    e.preventDefault();
    if(!activeWorkspaceId || !inviteEmail.trim()) return;

    try {
      setInviteError("");
      await api.post(`/workspaces/${activeWorkspaceId}/invite`,{
        email: inviteEmail.trim(),
        role: inviteRole,
      });
      setInviteEmail("");
    } catch (err) {
      setInviteError(err?.response?.data?.message || "Failed to send invite");
    }
  };

  if (authLoading || workspaceLoading) {
    return <p>Loading...</p>;
  }

  if (!user) return <Login />;

  return (
    <div className="app-shell">
      <div className="topbar">
        <h1>
          Welcome, {user.name}
          {activeWorkspace && ` - ${activeWorkspace.name}`}
        </h1>
        <div className="top-actions">
          <NotificationCenter />
          <button className="button" onClick={logout}>Logout</button>
        </div>
      </div>

      <div className="panel">
        <form onSubmit={createWorkspace} className="form-row">
          <input
            className="input"
            type="text"
            placeholder="New workspace name"
            value={newWorkspaceName}
            onChange={(e) => setNewWorkspaceName(e.target.value)}
          />
          <button className="button" type="submit">
            Create Workspace
          </button>
        </form>

        <div className="form-row section">
          <label>Workspace:</label>
          <select
            className="select"
            value={activeWorkspaceId || ""}
            onChange={(e) => selectWorkspace(e.target.value)}
          >
            <option value="" disabled>
              Select a workspace
            </option>
            {workspaces.map((ws) => (
              <option key={ws._id} value={ws._id}>
                {ws.name}
              </option>
            ))}
          </select>
        </div>

        <form onSubmit={sendInvite} className="form-row">
          <input
            className="input"
            type="email"
            placeholder="Invite user email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
          />
          <select
            className="select"
            value={inviteRole}
            onChange={(e) => setInviteRole(e.target.value)}
          >
            <option value="MEMBER">MEMBER</option>
            <option value="VIEWER">VIEWER</option>
          </select>
          <button className="button" type="submit">
            Invite
          </button>
        </form>
        {inviteError && <p className="notice section">{inviteError}</p>}
      </div>

      <Invites />
      <Dashboard />
      <WorkspaceMembers />
      <Boards />

      {!activeWorkspaceId ? (
        <p className="notice">Select a workspace to view activity.</p>
      ) : (
        <ActivityFeed workspaceId={activeWorkspaceId} />
      )}
    </div>
  );
}

export default App;
