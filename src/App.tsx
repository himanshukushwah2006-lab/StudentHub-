import { useCallback, useEffect, useState } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import { AmbientBackdrop, triggerClickRipple } from "@/src/components/AmbientBackdrop";
import { AtmosphereManager } from "@/src/components/AtmosphereManager";
import { AppShell, type RouteId } from "@/src/components/AppShell";
import { ErrorBoundary } from "@/src/components/ErrorBoundary";
import { StudentDetailDrawer } from "@/src/components/StudentUI";
import { DashboardPage } from "@/src/pages/DashboardPage";
import { StudentsPage } from "@/src/pages/StudentsPage";
import { AddStudentPage } from "@/src/pages/AddStudentPage";
import { SearchPage } from "@/src/pages/SearchPage";
import { SettingsPage } from "@/src/pages/SettingsPage";
import { AdminLoginPage } from "@/src/pages/AdminLoginPage";
import { PublicPortalPage } from "@/src/pages/PublicPortalPage";
import { AuthProvider, useAuth } from "@/src/lib/auth";
import {
  getLastSoundTime,
  getSoundSettings,
  playCursorGlide,
  playHoverSound,
  playMechanicalKey,
  playSound,
} from "@/src/lib/sound";
import { useStudents, useStudentsSync, type Branch, type Student } from "@/src/lib/students";

const INTERACTIVE_SELECTOR =
  'button, a, select, summary, input, textarea, label, [role="button"], [role="tab"], tr.cursor-pointer, .recharts-bar-rectangle';
const NAV_HOVER_SELECTOR = 'nav button, header button, aside nav button';
const CARD_HOVER_SELECTOR = '.spotlight-card, tr.row-luminous, .row-luminous';

function AppContent() {
  const { admin, isAdmin, loading: authLoading, logout } = useAuth();
  useStudentsSync(isAdmin, admin?.id ?? null);

  const students = useStudents();
  const [route, setRoute] = useState<RouteId>("dashboard");
  const [branchFilter, setBranchFilter] = useState<Branch | "ALL">("ALL");
  const [selectedRoll, setSelectedRoll] = useState<string | null>(null);
  const [publicView, setPublicView] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const selectedStudent: Student | null =
    isAdmin && selectedRoll ? students.find((s) => s.roll === selectedRoll) ?? null : null;

  const notify = useCallback((message: string) => {
    setToast(message);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 3400);
    return () => window.clearTimeout(id);
  }, [toast]);

  // Clear sensitive admin UI state whenever session ends
  useEffect(() => {
    if (!isAdmin) {
      setSelectedRoll(null);
      setRoute("dashboard");
      setBranchFilter("ALL");
    } else {
      setPublicView(false);
    }
  }, [isAdmin]);

  // Global click audio + synchronized background acoustic ripple
  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      if (e.clientX || e.clientY) {
        triggerClickRipple(e.clientX, e.clientY);
      }

      if (performance.now() - getLastSoundTime() < 45) return;

      const target = e.target as HTMLElement | null;
      const isInteractive = Boolean(target?.closest(INTERACTIVE_SELECTOR));

      if (isInteractive) {
        playSound("click");
      } else if (getSoundSettings().clickAnywhere) {
        playSound("soft");
      }
    };

    window.addEventListener("click", handleGlobalClick, false);
    return () => window.removeEventListener("click", handleGlobalClick, false);
  }, []);

  // Smooth cursor hover & page glide audio (desktop fine pointer only)
  useEffect(() => {
    const finePointer =
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(pointer: fine)").matches;
    if (!finePointer) return;

    let lastHoveredNode: Element | null = null;
    let lastX = 0;
    let lastY = 0;
    let hasPrev = false;

    const handlePointerOver = (e: PointerEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      const navEl = target.closest(NAV_HOVER_SELECTOR);
      if (navEl) {
        if (navEl !== lastHoveredNode) {
          lastHoveredNode = navEl;
          playHoverSound("nav");
        }
        return;
      }

      const controlEl = target.closest('button, a, select, [role="button"], [role="tab"]');
      if (controlEl) {
        if (controlEl !== lastHoveredNode) {
          lastHoveredNode = controlEl;
          playHoverSound("control");
        }
        return;
      }

      const cardEl = target.closest(CARD_HOVER_SELECTOR);
      if (cardEl) {
        if (cardEl !== lastHoveredNode) {
          lastHoveredNode = cardEl;
          playHoverSound("card");
        }
        return;
      }

      lastHoveredNode = null;
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (!hasPrev) {
        lastX = e.clientX;
        lastY = e.clientY;
        hasPrev = true;
        return;
      }
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;

      const dist = Math.hypot(dx, dy);
      if (dist > 26 && window.innerWidth > 0) {
        playCursorGlide(e.clientX / window.innerWidth, dist);
      }
    };

    document.addEventListener("pointerover", handlePointerOver, { passive: true });
    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    return () => {
      document.removeEventListener("pointerover", handlePointerOver);
      window.removeEventListener("pointermove", handlePointerMove);
    };
  }, []);

  // Mechanical keyboard typing sound across all inputs, search bars, and textareas
  useEffect(() => {
    const IGNORED_KEYS = new Set([
      "Shift",
      "Control",
      "Alt",
      "Meta",
      "CapsLock",
      "Escape",
      "ArrowUp",
      "ArrowDown",
      "ArrowLeft",
      "ArrowRight",
      "Home",
      "End",
      "PageUp",
      "PageDown",
      "Insert",
      "NumLock",
      "ScrollLock",
      "Pause",
    ]);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (IGNORED_KEYS.has(e.key)) return;

      const target = e.target as HTMLElement | null;
      if (!target) return;

      const tag = target.tagName;
      const isTextInput =
        tag === "TEXTAREA" ||
        target.isContentEditable ||
        (tag === "INPUT" &&
          !["range", "checkbox", "radio", "color", "file", "button", "submit", "reset"].includes(
            (target as HTMLInputElement).type
          ));

      if (isTextInput) {
        playMechanicalKey(e.key);
      }
    };

    window.addEventListener("keydown", handleKeyDown, { passive: true });
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleNavigate = (next: RouteId) => {
    if (!isAdmin) return;
    setRoute(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleLogout = async () => {
    playSound("soft");
    setSelectedRoll(null);
    setPublicView(false);
    await logout();
    notify("Signed out securely. Admin session ended.");
  };

  return (
    <>
      <AmbientBackdrop />
      <AtmosphereManager />

      {authLoading ? (
        <div className="flex min-h-screen items-center justify-center p-6">
          <div className="glass-panel-strong flex flex-col items-center rounded-2xl border border-cyan-400/30 px-8 py-7 text-center shadow-2xl">
            <div className="grid size-12 place-items-center rounded-xl border border-cyan-400/35 bg-cyan-500/15 text-cyan-300">
              <ShieldCheck className="size-6" />
            </div>
            <div className="mt-4 flex items-center gap-2.5 text-sm font-medium text-[var(--foreground)]">
              <Loader2 className="size-4 animate-spin text-cyan-400" />
              <span>Verifying Admin Session...</span>
            </div>
            <p className="mt-1 text-xs text-[var(--muted-foreground)]">
              MITS StudentHub Security Gate
            </p>
          </div>
        </div>
      ) : !isAdmin ? (
        publicView ? (
          <PublicPortalPage onOpenAdminLogin={() => setPublicView(false)} />
        ) : (
          <AdminLoginPage onOpenPublicPortal={() => setPublicView(true)} onNotify={notify} />
        )
      ) : (
        <>
          {/* Outer dark-area galaxy background behind all dashboard cards & workspace */}
          <div
            aria-hidden="true"
            className={`pointer-events-none fixed inset-0 -z-[5] lg:left-64 ${
              route === "add" ? "dashboard-galaxy-backdrop-add" : "dashboard-galaxy-backdrop"
            }`}
          />

          <AppShell
            route={route}
            onNavigate={handleNavigate}
            totalCount={students.length}
            adminEmail={admin?.username}
            onLogout={() => void handleLogout()}
          >
            <div key={route} className="page-enter">
              {route === "dashboard" && (
                <DashboardPage
                  onNavigate={handleNavigate}
                  onSelectStudent={(s) => setSelectedRoll(s.roll)}
                  onFilterBranch={(b) => setBranchFilter(b)}
                  onNotify={notify}
                />
              )}
              {route === "students" && (
                <StudentsPage
                  branchFilter={branchFilter}
                  onBranchFilterChange={setBranchFilter}
                  onNavigate={handleNavigate}
                  onSelectStudent={(s) => setSelectedRoll(s.roll)}
                  onNotify={notify}
                />
              )}
              {route === "add" && <AddStudentPage onNavigate={handleNavigate} onNotify={notify} />}
              {route === "search" && <SearchPage onSelectStudent={(s) => setSelectedRoll(s.roll)} />}
              {route === "settings" && <SettingsPage onNotify={notify} />}
            </div>
          </AppShell>

          <StudentDetailDrawer
            student={selectedStudent}
            onClose={() => setSelectedRoll(null)}
            onNotify={notify}
          />
        </>
      )}

      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="glass-panel-strong fixed right-5 bottom-5 z-50 rounded-xl border border-[var(--border-strong)] px-4 py-3 text-sm font-medium text-[var(--foreground)] shadow-lg animate-rise"
        >
          {toast}
        </div>
      )}
    </>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ErrorBoundary>
  );
}
