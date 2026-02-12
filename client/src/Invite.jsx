import { useEffect, useState } from "react";
import api from "./api/axios";
import { connectSocket, getSocket } from "./api/socket";
import { useAuth } from "./context/AuthContext";

function Invites() {
  const { token } = useAuth();
  const [invites, setInvites] = useState([]);
  const [error, setError] = useState("");

  const loadInvites = async () => {
    try {
      const res = await api.get("/workspaces/invites/me");
      setInvites(res.data || []);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load invites");
    }
  };

  useEffect(() => {
    loadInvites();
  }, []);

  useEffect(() => {
    let socket = getSocket();
    if (!socket && token) {
      socket = connectSocket(token);
    }
    if (!socket) return;

    const handleInvitesUpdated = () => {
      loadInvites();
    };

    socket.on("invites-updated", handleInvitesUpdated);
    return () => {
      socket.off("invites-updated", handleInvitesUpdated);
    };
  }, [token]);

  const respond = async (id, action) => {
    try {
      setError("");
      await api.post(`/workspaces/invites/${id}/${action}`);
      loadInvites();
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to respond to invite");
    }
  };

  if (invites.length === 0 && !error) return null;

  const primaryButton =
    "inline-flex items-center justify-center rounded-xl bg-blue-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700";
  const secondaryButton =
    "inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50";

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Pending Invites</h3>
        <span className="text-sm text-slate-500">{invites.length}</span>
      </div>
      <ul className="mt-4 space-y-3">
        {invites.map((i) => (
          <li
            key={i._id}
            className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <div className="font-medium text-slate-900">
                {i.workspaceId?.name}
              </div>
              <div className="text-xs text-slate-500">Role: {i.role}</div>
            </div>
            <div className="flex items-center gap-2">
              <button className={primaryButton} onClick={() => respond(i._id, "accept")}>
                Accept
              </button>
              <button
                className={secondaryButton}
                onClick={() => respond(i._id, "decline")}
              >
                Decline
              </button>
            </div>
          </li>
        ))}
      </ul>
      {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}
    </div>
  );
}

export default Invites;

