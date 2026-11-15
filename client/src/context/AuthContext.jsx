
import { createContext, useContext, useState } from "react";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem("fixit_user");
    return savedUser ? JSON.parse(savedUser) : null;
  });

  function login(userData, token) {
    localStorage.setItem("fixit_token", token);
    localStorage.setItem("fixit_user", JSON.stringify(userData));
    setUser(userData);
  }

  function logout() {
    localStorage.removeItem("fixit_token");
    localStorage.removeItem("fixit_user");
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

