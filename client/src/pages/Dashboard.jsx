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
  if (!stats) return <p className="text-sm text-slate-500">Loading stats...</p>;

  const total = stats.total || 0;
  const max = Math.max(
    stats.byStatus.TODO || 0,
    stats.byStatus.DOING || 0,
    stats.byStatus.DONE || 0,
    1
  );
  const overdue = stats.due?.overdue || 0;
  const dueSoon = stats.due?.dueSoon || 0;

  const items = [
    { label: "TODO", value: stats.byStatus.TODO || 0, color: "bg-blue-500" },
    { label: "DOING", value: stats.byStatus.DOING || 0, color: "bg-amber-500" },
    { label: "DONE", value: stats.byStatus.DONE || 0, color: "bg-emerald-500" },
  ];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Workspace Stats</h3>
        <span className="text-sm text-slate-500">Total tasks: {total}</span>
      </div>

      <div className="mt-4 space-y-4">
        {items.map((item) => (
          <div key={item.label} className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-slate-700">{item.label}</span>
              <span className="text-slate-500">{item.value}</span>
            </div>
            <progress
              className={`h-2 w-full overflow-hidden rounded-full ${item.color}`}
              value={item.value}
              max={max}
            />
          </div>
        ))}
      </div>

      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3">
          <div className="text-xs font-semibold uppercase text-rose-600">Overdue</div>
          <div className="mt-1 text-2xl font-semibold text-rose-700">{overdue}</div>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <div className="text-xs font-semibold uppercase text-amber-600">Due Soon</div>
          <div className="mt-1 text-2xl font-semibold text-amber-700">{dueSoon}</div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;

