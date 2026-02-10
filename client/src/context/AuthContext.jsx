import { createContext,  useContext, useEffect, useState } from "react";
import api from "../api/axios";

import {
  connectSocket,
  disconnectSocket,
} from "../api/socket";


const AuthContext = createContext(null);

export const AuthProvider = ({children}) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const storedToken = localStorage.getItem("token");
        const storedUser = localStorage.getItem("user");

        if(storedToken && storedUser) {
            setToken(storedToken);
            setUser(JSON.parse(storedUser));

            connectSocket(storedToken);
        }
        setLoading(false);
    }, []);

    const login = async(email, password) => {
        const res = await api.post("/auth/login", { email, password });

        setToken(res.data.token);
        setUser(res.data.user);

        localStorage.setItem("token", res.data.token);
        localStorage.setItem("user", JSON.stringify(res.data.user));

        connectSocket(res.data.token);
    };

    const register = async (name, email, password) => {
        await api.post("/auth/register", {name , email, password});
    };

    const logout = () => {
        setToken(null);
        setUser(null);
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        localStorage.removeItem("activeWorkspaceId");

        disconnectSocket();
    };

    return(
        <AuthContext.Provider
        value={{user, token, login, register, logout, loading}}
        >{children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
