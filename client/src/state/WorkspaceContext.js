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

  useEffect(() => {
    let isMounted = true;

    const fetchWorkspaces = async () => {
      try {
        setLoading(true);
        const res = await api.get("/workspaces");

        if (!isMounted) return;

        setWorkspaces(res.data || []);

        if (res.data?.length === 1) {
          const id = res.data[0]._id;
          setActiveWorkspaceId(id);
          localStorage.setItem("activeWorkspaceId", id);
        }
      } catch (err) {
        if (!isMounted) return;
        setError("Failed to load workspaces");
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
