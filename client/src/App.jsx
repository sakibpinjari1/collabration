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
    <>
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >

      <h1>
        Welcome, {user.name}
        {activeWorkspace && ` - ${activeWorkspace.name}`}
      </h1>
      <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
        <NotificationCenter />
        <button onClick={logout}> Logout </button>
      </div>
    </div>

    <form onSubmit={createWorkspace} style={{ margin: "12px 0" }}>
      <input
        type="text"
        placeholder="New workspace name"
        value={newWorkspaceName}
        onChange={(e) => setNewWorkspaceName(e.target.value)}
      />
      <button type="submit" style={{ marginLeft: "8px" }}>
        Create Workspace
      </button>
    </form>

    <div style={{ margin: "16px 0" }}>
      <label style={{ marginRight: "8px" }}>Workspace:</label>
      <select
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

    <form onSubmit={sendInvite} style={{ margin: "12px 0" }}>
      <input
        type="email"
        placeholder="Invite user email"
        value={inviteEmail}
        onChange={(e) => setInviteEmail(e.target.value)}
      />
      <select
        value={inviteRole}
        onChange={(e) => setInviteRole(e.target.value)}
        style={{ marginLeft: "8px" }}
      >
        <option value="MEMBER">MEMBER</option>
        <option value="VIEWER">VIEWER</option>
      </select>
      <button type="submit" style={{ marginLeft: "8px" }}>
        Invite
      </button>
    </form>
    {inviteError && (
      <p style={{ color: "red", marginTop: "4px" }}>{inviteError}</p>
    )}

    <Invites />
    <WorkspaceMembers />
    <Boards />

    {!activeWorkspaceId ? (
      <p>Select a workspace to view activity.</p>
    ) : (
      <ActivityFeed workspaceId={activeWorkspaceId} />
    )}

    </>
  );
}

export default App;
