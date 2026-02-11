import { useEffect, useState } from "react";
import api from "../api/axios";
import { useWorkspace } from "../state/WorkspaceContext.jsx";

function Dashboard() {
  const { activeWorkspaceId } = useWorkspace();
  const [stats, setStats] = useState(null);

  useEffect(() => {
    if (!activeWorkspaceId) return;

    const loadStats = async () => {
      const res = await api.get(`/workspaces/${activeWorkspaceId}/stats`);
      setStats(res.data);
    };

    loadStats();
  }, [activeWorkspaceId]);

  if (!activeWorkspaceId) return null;
  if (!stats) return <p>Loading stats...</p>;

  const total = stats.total || 0;
  const max = Math.max(
    stats.byStatus.TODO || 0,
    stats.byStatus.DOING || 0,
    stats.byStatus.DONE || 0,
    1,
  );

  return (
    <div className="card" style={{ margin: "12px 0" }}>
      <h3>Workspace Stats</h3>
      <p>Total tasks: {stats.total}</p>
      <div style={{ display: "flex", gap: "12px", alignItems: "flex-end" }}>
        {[
          { label: "TODO", value: stats.byStatus.TODO, color: "#60a5fa" },
          { label: "DOING", value: stats.byStatus.DOING, color: "#f59e0b" },
          { label: "DONE", value: stats.byStatus.DONE, color: "#34d399" },
        ].map((item) => (
          <div key={item.label} style={{ textAlign: "center", width: "80px" }}>
            <div
              style={{
                height: `${Math.round((item.value / max) * 140)}px`,
                background: item.color,
                borderRadius: "6px",
                transition: "height 0.2s ease",
              }}
              title={`${item.label}: ${item.value}`}
            />
            <div style={{ marginTop: "6px", fontSize: "12px" }}>
              {item.label} ({item.value || 0})
            </div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: "8px", color: "#6b7280", fontSize: "12px" }}>
        Total: {total}
      </div>
    </div>
  );
}

export default Dashboard;
