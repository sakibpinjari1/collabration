import { useAuth } from "./context/AuthContext";
import { useWorkspace } from "./state/WorkspaceContext";
import ActivityFeed from "./pages/ActivityFeed";
import Login from "./pages/Login";

function App() {
  const { user, loading: authLoading, logout } = useAuth();
  const {
    activeWorkspaceId,
    activeWorkspace,
    loading: workspaceLoading,
  } = useWorkspace();

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
      <button onClick={logout}> Logout </button>
    </div>

    {!activeWorkspaceId ? (
      <p>Select a workspace to view activity.</p>
    ) : (
      <ActivityFeed workspaceId={activeWorkspaceId} />
    )}

    </>
  );
}

export default App;
