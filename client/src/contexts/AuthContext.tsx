import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface User {
  id: string;
  email: string;
  username: string;
  avatarUrl: string | null;
  xp: number;
  level: number;
  isAdmin: boolean;
  isBlocked: boolean;
  createdAt: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const { data: user, isLoading } = useQuery<User | null>({
    queryKey: ["/api", "me"],
    queryFn: async () => {
      const res = await fetch("/api/me", { credentials: "include" });
      if (res.status === 401) {
        return null;
      }
      if (!res.ok) {
        throw new Error("Failed to fetch user");
      }
      return res.json();
    },
    retry: false,
  });

  useEffect(() => {
    setIsAuthenticated(!!user);
  }, [user]);

  const loginMutation = useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      const response = await apiRequest("POST", "/api/login", { email, password });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api", "me"] });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async ({ email, username, password }: { email: string; username: string; password: string }) => {
      const response = await apiRequest("POST", "/api/register", { email, username, password });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api", "me"] });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/logout");
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api", "me"], null);
      setIsAuthenticated(false);
    },
  });

  const login = async (email: string, password: string) => {
    await loginMutation.mutateAsync({ email, password });
  };

  const register = async (email: string, username: string, password: string) => {
    await registerMutation.mutateAsync({ email, username, password });
  };

  const logout = async () => {
    await logoutMutation.mutateAsync();
  };

  return (
    <AuthContext.Provider
      value={{
        user: user || null,
        isLoading,
        login,
        register,
        logout,
        isAuthenticated,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
