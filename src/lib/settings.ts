import { useEffect, useState } from "react";

const ADMIN_KEY = "mits_studenthub_admin_name_v1";
const THEME_KEY = "mits_studenthub_theme_v1";

export type ThemeMode = "dark" | "light";

let adminNameState = (() => {
  try {
    return localStorage.getItem(ADMIN_KEY) || "Himanshu";
  } catch {
    return "Himanshu";
  }
})();

let themeState: ThemeMode = (() => {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    return saved === "light" ? "light" : "dark";
  } catch {
    return "dark";
  }
})();

const adminListeners = new Set<() => void>();
const themeListeners = new Set<() => void>();

function applyThemeToDom(mode: ThemeMode) {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", mode === "dark");
}

applyThemeToDom(themeState);

export function setAdminName(name: string) {
  const clean = name.trim() || "Admin";
  adminNameState = clean;
  try {
    localStorage.setItem(ADMIN_KEY, clean);
  } catch {
    // Ignore
  }
  adminListeners.forEach((cb) => cb());
}

export function useAdminName(): string {
  const [name, setName] = useState(adminNameState);
  useEffect(() => {
    const cb = () => setName(adminNameState);
    adminListeners.add(cb);
    return () => {
      adminListeners.delete(cb);
    };
  }, []);
  return name;
}

export function setTheme(mode: ThemeMode) {
  themeState = mode;
  applyThemeToDom(mode);
  try {
    localStorage.setItem(THEME_KEY, mode);
  } catch {
    // Ignore
  }
  themeListeners.forEach((cb) => cb());
}

export function useTheme(): [ThemeMode, (mode: ThemeMode) => void] {
  const [mode, setMode] = useState<ThemeMode>(themeState);
  useEffect(() => {
    applyThemeToDom(themeState);
    const cb = () => setMode(themeState);
    themeListeners.add(cb);
    return () => {
      themeListeners.delete(cb);
    };
  }, []);
  return [mode, setTheme];
}
