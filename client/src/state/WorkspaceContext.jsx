import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import { connectSocket, getSocket } from "../api/socket";

const WorkspaceContext = createContext(null);

export const WorkspaceProvider = ({ children }) => {
  const { user, token } = useAuth();
  const [workspaces, setWorkspaces] = useState([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState(
    () => sessionStorage.getItem("activeWorkspaceId") || null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const addWorkspace = (workspace) => {
  setWorkspaces((prev) => [...prev, workspace]);
  setActiveWorkspaceId(workspace._id);
  sessionStorage.setItem("activeWorkspaceId", workspace._id);
};


  const refreshWorkspaces = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get("/workspaces");
      const list = res.data || [];
      setWorkspaces(list);

      if (activeWorkspaceId) {
        const exists = list.some((w) => w._id === activeWorkspaceId);
        if (!exists) {
          setActiveWorkspaceId(null);
          sessionStorage.removeItem("activeWorkspaceId");
        }
      }

      if (list.length === 1) {
        const id = list[0]._id;
          setActiveWorkspaceId(id);
          sessionStorage.setItem("activeWorkspaceId", id);
      }
    } catch (err) {
      if (err?.response?.status === 403) {
        setError("You don't have access to this workspace.");
        setActiveWorkspaceId(null);
        sessionStorage.removeItem("activeWorkspaceId");
      } else {
        setError("Failed to load workspaces");
      }
    } finally {
      setLoading(false);
    }
  }, [activeWorkspaceId]);

  useEffect(() => {
    if (!token || !user?._id) {
      setWorkspaces([]);
      setActiveWorkspaceId(null);
      setLoading(false);
      return;
    }

    refreshWorkspaces();
  }, [token, user?._id, refreshWorkspaces]);

  useEffect(() => {
    let socket = getSocket();
    if (!socket && token) {
      socket = connectSocket(token);
    }
    if (!socket) return;

    const handleWorkspacesUpdated = () => {
      refreshWorkspaces();
    };

    socket.on("workspaces-updated", handleWorkspacesUpdated);
    return () => {
      socket.off("workspaces-updated", handleWorkspacesUpdated);
    };
  }, [token, refreshWorkspaces]);

  useEffect(() => {
    if (activeWorkspaceId) {
      sessionStorage.setItem("activeWorkspaceId", activeWorkspaceId);
    } else {
      sessionStorage.removeItem("activeWorkspaceId");
    }
  }, [activeWorkspaceId]);

  const activeWorkspace = useMemo(() => {
    return workspaces.find((w) => w._id === activeWorkspaceId) || null;
  }, [workspaces, activeWorkspaceId]);

  const selectWorkspace = (workspaceId) => {
    setActiveWorkspaceId(workspaceId);
  };

  const value = {
    workspaces,
    activeWorkspaceId,
    activeWorkspace,
    addWorkspace,
    loading,
    error,
    refreshWorkspaces,

    selectWorkspace,
    clearWorkspace: () => setActiveWorkspaceId(null),
  };

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
};

export const useWorkspace = () => {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error("useWorkspace must be used within a WorkspaceProvider");
  }
  return context;
};

