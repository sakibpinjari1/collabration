import { useEffect, useState } from "react";
import api from "./api/axios";

function Invites() {
    const [invites, setInvites] = useState([]);

    const loadInvites = async () => {
        const res = await api.get("/workspaces/invites/me");
        setInvites(res.data || []);
    };

    useEffect(() => {
        loadInvites();
    }, []);

    const respond = async (id, action) => {
        await api.post(`/workspaces/invites/${id}/${action}`);
        loadInvites();
    }

    if (invites.length === 0) return null;

  return (
    <div style={{ margin: "12px 0" }}>
      <h3>Pending Invites</h3>
      <ul>
        {invites.map((i) => (
          <li key={i._id}>
            {i.workspaceId?.name} - {i.role}
            <button onClick={() => respond(i._id, "accept")}>Accept</button>
            <button onClick={() => respond(i._id, "decline")}>Decline</button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default Invites;
