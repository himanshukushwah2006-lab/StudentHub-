import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export interface AdminSession {
  id: string;
  username: string;
  displayName: string;
  isEnvAdmin: boolean;
}

export interface AdminAccountSummary {
  id: string;
  username: string;
  displayName: string;
  createdAt: number;
  updatedAt: number;
}

interface AuthContextValue {
  admin: AdminSession | null;
  isAdmin: boolean;
  needsSetup: boolean;
  loading: boolean;
  submitting: boolean;
  authError: string | null;
  adminAccounts: AdminAccountSummary[];
  clearAuthError: () => void;
  setupInitialAdmin: (username: string, password: string) => Promise<boolean>;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  updateCredentials: (
    currentPassword: string,
    newUsername: string,
    newPassword: string
  ) => Promise<{ ok: true } | { ok: false; error: string }>;
  createAdminAccount: (
    username: string,
    password: string
  ) => Promise<{ ok: true } | { ok: false; error: string }>;
  deleteAdminAccount: (id: string) => Promise<{ ok: true } | { ok: false; error: string }>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// Held strictly in JS memory (never localStorage or sessionStorage)
let inMemorySessionToken: string | null = null;

export function getAuthHeaders(includeJson = true): Record<string, string> {
  const headers: Record<string, string> = {
    "X-Requested-With": "MITS-StudentHub",
  };
  if (includeJson) {
    headers["Content-Type"] = "application/json";
  }
  if (inMemorySessionToken) {
    headers["Authorization"] = `Bearer ${inMemorySessionToken}`;
  }
  return headers;
}

async function parseJsonSafe(res: Response): Promise<Record<string, unknown>> {
  try {
    return (await res.json()) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<AdminSession | null>(null);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [adminAccounts, setAdminAccounts] = useState<AdminAccountSummary[]>([]);

  const isAdmin = Boolean(admin);

  const fetchAdminAccounts = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/admins", {
        method: "GET",
        credentials: "same-origin",
        headers: getAuthHeaders(false),
      });
      if (!res.ok) return;
      const data = await parseJsonSafe(res);
      if (Array.isArray(data.admins)) {
        setAdminAccounts(data.admins as AdminAccountSummary[]);
      }
    } catch {
      // Non-fatal
    }
  }, []);

  // Check active session (via HttpOnly cookie or in-memory bearer token) on mount
  useEffect(() => {
    let active = true;
    fetch("/api/auth/me", {
      method: "GET",
      credentials: "same-origin",
      headers: getAuthHeaders(false),
    })
      .then(async (res) => {
        const data = await parseJsonSafe(res);
        if (!active) return;
        setNeedsSetup(Boolean(data.needsSetup));
        if (data.authenticated && data.admin && typeof data.admin === "object") {
          setAdmin(data.admin as AdminSession);
        } else {
          inMemorySessionToken = null;
          setAdmin(null);
        }
      })
      .catch(() => {
        if (!active) return;
        inMemorySessionToken = null;
        setAdmin(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (isAdmin) {
      void fetchAdminAccounts();
    } else {
      setAdminAccounts([]);
    }
  }, [isAdmin, fetchAdminAccounts]);

  const clearAuthError = useCallback(() => setAuthError(null), []);

  const setupInitialAdmin = useCallback(
    async (username: string, password: string): Promise<boolean> => {
      setSubmitting(true);
      setAuthError(null);
      try {
        const res = await fetch("/api/auth/setup", {
          method: "POST",
          credentials: "same-origin",
          headers: getAuthHeaders(true),
          body: JSON.stringify({ username: username.trim(), password }),
        });
        const data = await parseJsonSafe(res);
        if (!res.ok) {
          setAuthError(
            typeof data.error === "string"
              ? data.error
              : "Could not create administrator account."
          );
          return false;
        }
        if (typeof data.token === "string") {
          inMemorySessionToken = data.token;
        }
        setAdmin(data.admin as AdminSession);
        setNeedsSetup(false);
        return true;
      } catch {
        setAuthError("Unable to reach the authentication server. Please try again.");
        return false;
      } finally {
        setSubmitting(false);
      }
    },
    []
  );

  const login = useCallback(async (username: string, password: string): Promise<boolean> => {
    const cleanUser = username.trim();
    if (!cleanUser || !password) {
      setAuthError("Please enter both username and password.");
      return false;
    }

    setSubmitting(true);
    setAuthError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        credentials: "same-origin",
        headers: getAuthHeaders(true),
        body: JSON.stringify({ username: cleanUser, password }),
      });
      const data = await parseJsonSafe(res);
      if (!res.ok) {
        setAuthError(
          typeof data.error === "string"
            ? data.error
            : "Invalid username or password. Please try again."
        );
        return false;
      }
      if (typeof data.token === "string") {
        inMemorySessionToken = data.token;
      }
      setAdmin(data.admin as AdminSession);
      setNeedsSetup(false);
      return true;
    } catch {
      setAuthError("Network error while contacting authentication server.");
      return false;
    } finally {
      setSubmitting(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setSubmitting(true);
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "same-origin",
        headers: getAuthHeaders(false),
      }).catch(() => {});
    } finally {
      inMemorySessionToken = null;
      setAdmin(null);
      setAdminAccounts([]);
      setAuthError(null);
      setSubmitting(false);
    }
  }, []);

  const updateCredentials = useCallback(
    async (
      currentPassword: string,
      newUsername: string,
      newPassword: string
    ): Promise<{ ok: true } | { ok: false; error: string }> => {
      try {
        const res = await fetch("/api/auth/credentials", {
          method: "PATCH",
          credentials: "same-origin",
          headers: getAuthHeaders(true),
          body: JSON.stringify({
            currentPassword,
            newUsername: newUsername.trim(),
            newPassword,
          }),
        });
        const data = await parseJsonSafe(res);
        if (!res.ok) {
          return {
            ok: false,
            error:
              typeof data.error === "string"
                ? data.error
                : "Could not update admin credentials.",
          };
        }
        if (typeof data.token === "string") {
          inMemorySessionToken = data.token;
        }
        if (data.admin && typeof data.admin === "object") {
          setAdmin(data.admin as AdminSession);
        }
        void fetchAdminAccounts();
        return { ok: true };
      } catch {
        return { ok: false, error: "Network error while updating credentials." };
      }
    },
    [fetchAdminAccounts]
  );

  const createAdminAccount = useCallback(
    async (
      username: string,
      password: string
    ): Promise<{ ok: true } | { ok: false; error: string }> => {
      try {
        const res = await fetch("/api/auth/admins", {
          method: "POST",
          credentials: "same-origin",
          headers: getAuthHeaders(true),
          body: JSON.stringify({ username: username.trim(), password }),
        });
        const data = await parseJsonSafe(res);
        if (!res.ok) {
          return {
            ok: false,
            error:
              typeof data.error === "string" ? data.error : "Could not create admin account.",
          };
        }
        await fetchAdminAccounts();
        return { ok: true };
      } catch {
        return { ok: false, error: "Network error while creating admin account." };
      }
    },
    [fetchAdminAccounts]
  );

  const deleteAdminAccount = useCallback(
    async (id: string): Promise<{ ok: true } | { ok: false; error: string }> => {
      try {
        const res = await fetch(`/api/auth/admins/${encodeURIComponent(id)}`, {
          method: "DELETE",
          credentials: "same-origin",
          headers: getAuthHeaders(false),
        });
        const data = await parseJsonSafe(res);
        if (!res.ok) {
          return {
            ok: false,
            error:
              typeof data.error === "string" ? data.error : "Could not delete admin account.",
          };
        }
        await fetchAdminAccounts();
        return { ok: true };
      } catch {
        return { ok: false, error: "Network error while removing admin account." };
      }
    },
    [fetchAdminAccounts]
  );

  return (
    <AuthContext.Provider
      value={{
        admin,
        isAdmin,
        needsSetup,
        loading,
        submitting,
        authError,
        adminAccounts,
        clearAuthError,
        setupInitialAdmin,
        login,
        logout,
        updateCredentials,
        createAdminAccount,
        deleteAdminAccount,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return ctx;
}
