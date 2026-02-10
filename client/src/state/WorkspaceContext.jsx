import { createContext, useContext, useEffect, useMemo, useState } from "react";
import api from "../api/axios";

const WorkspaceContext = createContext(null);

export const WorkspaceProvider = ({ children }) => {
  const [workspaces, setWorkspaces] = useState([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState(
    () => localStorage.getItem("activeWorkspaceId") || null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const addWorkspace = (workspace) => {
  setWorkspaces((prev) => [...prev, workspace]);
  setActiveWorkspaceId(workspace._id);
  localStorage.setItem("activeWorkspaceId", workspace._id);
};


  useEffect(() => {
    let isMounted = true;

    const fetchWorkspaces = async () => {
      try {
        setLoading(true);
        const res = await api.get("/workspaces");

        if (!isMounted) return;

        const list = res.data || [];
        setWorkspaces(list);

        if (activeWorkspaceId) {
          const exists = list.some((w) => w._id === activeWorkspaceId);
          if (!exists) {
            setActiveWorkspaceId(null);
            localStorage.removeItem("activeWorkspaceId");
          }
        }

        if (list.length === 1) {
          const id = list[0]._id;
          setActiveWorkspaceId(id);
          localStorage.setItem("activeWorkspaceId", id);
        }
      } catch (err) {
        if (!isMounted) return;
        if (err?.response?.status === 403) {
          setError("You don't have access to this workspace.");
          setActiveWorkspaceId(null);
          localStorage.removeItem("activeWorkspaceId");
        } else {
          setError("Failed to load workspaces");
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchWorkspaces();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (activeWorkspaceId) {
      localStorage.setItem("activeWorkspaceId", activeWorkspaceId);
    } else {
      localStorage.removeItem("activeWorkspaceId");
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
