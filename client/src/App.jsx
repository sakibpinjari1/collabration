import { useState } from "react";
import { Link, Route, Routes } from "react-router-dom";
import api from "./api/axios";
import { useAuth } from "./context/AuthContext";
import { useWorkspace } from "./state/WorkspaceContext.jsx";
import ActivityFeed from "./pages/ActivityFeed";
import Boards from "./pages/Boards";
import Login from "./pages/Login";
import WorkspaceMembers from "./pages/WorkspaceMembers";
import Invites from "./Invite";
import Dashboard from "./pages/Dashboard";
import NotificationsPage from "./pages/NotificationsPage";

function App() {
  const { user, loading: authLoading, logout } = useAuth();
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
    if (!activeWorkspaceId || !inviteEmail.trim()) return;

    try {
      setInviteError("");
      await api.post(`/workspaces/${activeWorkspaceId}/invite`, {
        email: inviteEmail.trim(),
        role: inviteRole,
      });
      setInviteEmail("");
    } catch (err) {
      setInviteError(err?.response?.data?.message || "Failed to send invite");
    }
  };

  if (authLoading || workspaceLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-600">
        Loading...
      </div>
    );
  }

  if (!user) return <Login />;

  const inputClass =
    "w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500";
  const selectClass =
    "w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500";
  const primaryButton =
    "inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700";
  const secondaryButton =
    "inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50";

  const HomeLayout = (
    <>
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
        <form onSubmit={createWorkspace} className="flex flex-col sm:flex-row gap-3">
          <input
            className={inputClass}
            type="text"
            placeholder="New workspace name"
            value={newWorkspaceName}
            onChange={(e) => setNewWorkspaceName(e.target.value)}
          />
          <button className={primaryButton} type="submit">
            Create Workspace
          </button>
        </form>

        <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
          <label className="text-sm font-medium text-slate-600">Workspace</label>
          <select
            className={selectClass}
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

        <form onSubmit={sendInvite} className="flex flex-col lg:flex-row gap-3">
          <input
            className={inputClass}
            type="email"
            placeholder="Invite user email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
          />
          <select
            className={selectClass}
            value={inviteRole}
            onChange={(e) => setInviteRole(e.target.value)}
          >
            <option value="MEMBER">MEMBER</option>
            <option value="VIEWER">VIEWER</option>
          </select>
          <button className={primaryButton} type="submit">
            Invite
          </button>
        </form>
        {inviteError && <p className="text-sm text-red-600">{inviteError}</p>}
      </div>

      <Invites />
      <Dashboard />
      <WorkspaceMembers />
      <Boards />

      {!activeWorkspaceId ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500">
          Select a workspace to view activity.
        </div>
      ) : (
        <ActivityFeed workspaceId={activeWorkspaceId} />
      )}
    </>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-sm backdrop-blur">
          <div>
            <p className="text-sm text-slate-500">Welcome back</p>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
              {user.name}
              {activeWorkspace && (
                <span className="text-slate-500"> · {activeWorkspace.name}</span>
              )}
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              to="/"
              className={secondaryButton}
            >
              Home
            </Link>
            <Link
              to="/notifications"
              className={secondaryButton}
            >
              Notifications
            </Link>
            <button className={secondaryButton} onClick={logout}>
              Logout
            </button>
          </div>
        </div>

        <Routes>
          <Route path="/" element={HomeLayout} />
          <Route path="/notifications" element={<NotificationsPage />} />
        </Routes>
      </div>
    </div>
  );
}

export default App;
