import { useEffect, useState, type ReactNode } from "react";
import {
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  Search,
  Settings,
  ShieldCheck,
  Sun,
  UserPlus,
  Users,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { onSoundPlayed, playSound, SOUND_PROFILES, useSoundSettings } from "@/src/lib/sound";
import { useTheme } from "@/src/lib/settings";
import { MagneticButton } from "@/src/components/InteractiveSurface";
import futuristicSidebarBg from "@/src/assets/images/futuristic_sidebar_bg_1795554863917.jpg";

export type RouteId = "dashboard" | "students" | "add" | "search" | "settings";

const NAV_ITEMS: { id: RouteId; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "students", label: "All Students", icon: Users },
  { id: "add", label: "Add Student", icon: UserPlus },
  { id: "search", label: "Search", icon: Search },
  { id: "settings", label: "Settings", icon: Settings },
];

const ROUTE_TITLES: Record<RouteId, string> = {
  dashboard: "Dashboard",
  students: "All Students",
  add: "Add Student",
  search: "Search Directory",
  settings: "Settings & Audio",
};

export function AppShell({
  route,
  onNavigate,
  totalCount,
  adminEmail,
  onLogout,
  children,
}: {
  route: RouteId;
  onNavigate: (next: RouteId) => void;
  totalCount: number;
  adminEmail?: string | null;
  onLogout: () => void;
  children: ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { settings, setEnabled, setProfile } = useSoundSettings();
  const [theme, setTheme] = useTheme();
  const [soundPulse, setSoundPulse] = useState(false);

  useEffect(() => {
    let timer = 0;
    const unsub = onSoundPlayed(() => {
      setSoundPulse(true);
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setSoundPulse(false), 180);
    });
    return () => {
      window.clearTimeout(timer);
      unsub();
    };
  }, []);

  const handleNav = (id: RouteId) => {
    playSound("nav");
    onNavigate(id);
    setMobileOpen(false);
  };

  const cycleSoundProfile = () => {
    const idx = SOUND_PROFILES.findIndex((p) => p.id === settings.profile);
    const next = SOUND_PROFILES[(idx + 1) % SOUND_PROFILES.length];
    if (!settings.enabled) {
      setEnabled(true);
    }
    setProfile(next.id);
  };

  const currentProfileLabel =
    SOUND_PROFILES.find((p) => p.id === settings.profile)?.label ?? "Studio Tactile";

  const sidebarContent = (
    <div className="relative h-full w-full overflow-hidden">
      {/* Full-bleed futuristic neon-blue sidebar background */}
      <img
        src={futuristicSidebarBg}
        alt=""
        aria-hidden="true"
        referrerPolicy="no-referrer"
        className="pointer-events-none absolute inset-0 z-0 h-full w-full object-cover object-center"
      />
      {/* Subtle vertical contrast scrim preserving glowing neon trails & bottom skyline */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-[1]"
        style={{
          background:
            "linear-gradient(180deg, rgba(4, 8, 22, 0.72) 0%, rgba(4, 10, 26, 0.46) 44%, rgba(4, 10, 26, 0.58) 76%, rgba(4, 8, 22, 0.84) 100%)",
        }}
      />

      <div className="relative z-10 flex h-full flex-col justify-between p-4">
        <div>
          <div className="flex items-center justify-between px-2.5 py-2">
            <button
              type="button"
              onClick={() => handleNav("dashboard")}
              className="text-left font-display text-lg font-bold tracking-tight text-white drop-shadow-sm whitespace-nowrap shrink-0"
            >
              MITS{" "}
              <span className="bg-gradient-to-r from-cyan-300 via-sky-300 to-violet-300 bg-clip-text text-transparent">
                StudentHub
              </span>
            </button>
            <button
              type="button"
              onClick={() => {
                playSound("soft");
                setMobileOpen(false);
              }}
              aria-label="Close menu"
              className="grid size-8 place-items-center rounded-lg text-slate-300 hover:bg-white/10 hover:text-white lg:hidden"
            >
              <X className="size-4" />
            </button>
          </div>

          <nav aria-label="Main navigation" className="mt-6 space-y-1.5">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = route === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNav(item.id)}
                  className={`group relative flex w-full items-center gap-3 overflow-hidden rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all duration-200 whitespace-nowrap active:scale-[0.98] ${
                    active
                      ? "bg-gradient-to-r from-cyan-500/28 via-blue-500/20 to-violet-500/14 text-cyan-200 shadow-[inset_0_0_0_1px_rgba(34,211,238,0.42),0_0_22px_-6px_rgba(34,211,238,0.5)] backdrop-blur-sm"
                      : "text-slate-200/85 hover:translate-x-0.5 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <Icon
                    className={`size-4 shrink-0 transition-transform duration-200 ${
                      active
                        ? "scale-105 text-cyan-300"
                        : "text-slate-300/90 group-hover:scale-110 group-hover:text-cyan-300"
                    }`}
                  />
                  <span>{item.label}</span>
                  {item.id === "students" && (
                    <span className="ml-auto font-mono text-xs tabular-nums text-cyan-200/85">
                      {totalCount}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="space-y-2 border-t border-cyan-400/20 pt-4">
          {/* Click Sound Quick Control */}
          <div className="rounded-xl border border-cyan-400/20 bg-slate-950/60 p-3 backdrop-blur-md">
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setEnabled(!settings.enabled)}
                className="flex min-w-0 items-center gap-2 text-xs font-medium text-white"
              >
                {settings.enabled ? (
                  <Volume2
                    className={`size-4 shrink-0 text-cyan-300 transition-transform duration-150 ${
                      soundPulse ? "scale-125" : "scale-100"
                    }`}
                  />
                ) : (
                  <VolumeX className="size-4 shrink-0 text-slate-400" />
                )}
                <span className="truncate">
                  {settings.enabled ? "Click Sound On" : "Click Sound Off"}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setEnabled(!settings.enabled)}
                aria-label={settings.enabled ? "Mute click sounds" : "Enable click sounds"}
                className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${
                  settings.enabled ? "bg-sky-500" : "bg-slate-600/70"
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 size-4 rounded-full bg-white shadow-xs transition-transform ${
                    settings.enabled ? "translate-x-4" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
            <div className="mt-2.5 flex items-center justify-between gap-2">
              <span className="truncate text-[11px] text-slate-300/85">
                {currentProfileLabel}
              </span>
              <button
                type="button"
                onClick={cycleSoundProfile}
                className="text-[11px] font-medium text-cyan-300 hover:underline whitespace-nowrap shrink-0"
              >
                Switch tone
              </button>
            </div>
          </div>

          {/* Theme Switcher */}
          <button
            type="button"
            onClick={() => {
              playSound("toggle");
              setTheme(theme === "dark" ? "light" : "dark");
            }}
            className="flex w-full items-center justify-between rounded-xl border border-cyan-400/20 bg-slate-950/55 px-3 py-2.5 text-xs font-medium text-white backdrop-blur-md transition-colors hover:border-cyan-400/40 hover:bg-slate-900/75"
          >
            <span className="flex items-center gap-2">
              {theme === "dark" ? (
                <Moon className="size-3.5 text-indigo-300" />
              ) : (
                <Sun className="size-3.5 text-amber-400" />
              )}
              <span>{theme === "dark" ? "Obsidian Dark" : "Daylight Studio"}</span>
            </span>
            <span className="text-cyan-200/75">Toggle</span>
          </button>

          {/* Verified Admin Session & Logout */}
          <div className="rounded-xl border border-cyan-400/20 bg-slate-950/65 p-2.5 backdrop-blur-md">
            <div className="flex items-center gap-2 px-1">
              <ShieldCheck className="size-3.5 shrink-0 text-emerald-400" />
              <span className="truncate font-mono text-[11px] font-medium text-slate-200" title={adminEmail ?? "Admin"}>
                {adminEmail ? `@${adminEmail}` : "Authorized Admin"}
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                setMobileOpen(false);
                onLogout();
              }}
              className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg border border-red-400/30 bg-red-500/15 px-3 py-1.5 text-xs font-semibold text-red-200 transition-colors hover:border-red-400/55 hover:bg-red-500/25 hover:text-white"
            >
              <LogOut className="size-3.5" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen lg:flex">
      {/* Desktop Fixed Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-cyan-400/25 bg-slate-950 shadow-[6px_0_32px_-12px_rgba(0,0,0,0.75)] lg:block">
        {sidebarContent}
      </aside>

      {/* Mobile Sidebar Drawer */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-xs lg:hidden"
          onClick={() => {
            playSound("soft");
            setMobileOpen(false);
          }}
        >
          <aside
            className="h-full w-68 border-r border-cyan-400/25 bg-slate-950 shadow-[8px_0_36px_-10px_rgba(0,0,0,0.85)]"
            onClick={(e) => e.stopPropagation()}
          >
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Main Workspace Area */}
      <div className="flex min-h-screen flex-1 flex-col lg:pl-64">
        <header className="glass-panel sticky top-0 z-20 flex h-16 items-center justify-between gap-6 border-x-0 border-t-0 border-b border-[var(--border)] px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => {
                playSound("click");
                setMobileOpen(true);
              }}
              aria-label="Open menu"
              className="grid size-9 shrink-0 place-items-center rounded-xl border border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--surface-hover)] lg:hidden"
            >
              <Menu className="size-4" />
            </button>
            <div className="flex items-center gap-2 text-sm min-w-0">
              <span className="hidden text-[var(--muted-foreground)] sm:inline whitespace-nowrap">
                StudentHub
              </span>
              <span className="hidden text-[var(--muted-foreground)] sm:inline" aria-hidden="true">
                /
              </span>
              <span className="truncate font-display font-semibold text-[var(--foreground)]">
                {ROUTE_TITLES[route]}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <MagneticButton
              type="button"
              strength={0.16}
              maxOffset={4}
              onClick={() => handleNav("search")}
              className="btn-glass-glow hidden items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-medium text-[var(--muted-foreground)] hover:text-[var(--foreground)] sm:inline-flex whitespace-nowrap shrink-0"
            >
              <Search className="size-3.5" />
              <span>Quick search</span>
            </MagneticButton>

            <MagneticButton
              type="button"
              strength={0.2}
              maxOffset={5}
              onClick={() => handleNav("add")}
              className="btn-futuristic inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold whitespace-nowrap shrink-0"
            >
              <UserPlus className="size-3.5" />
              <span>Add student</span>
            </MagneticButton>

            <button
              type="button"
              onClick={onLogout}
              title={`Sign out (${adminEmail || "Admin"})`}
              aria-label="Logout"
              className="btn-glass-glow inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium text-[var(--muted-foreground)] transition-colors hover:border-red-500/40 hover:text-red-500 dark:hover:text-red-400 whitespace-nowrap shrink-0"
            >
              <LogOut className="size-3.5" />
              <span className="hidden md:inline">Logout</span>
            </button>
          </div>
        </header>

        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
