import { useEffect, useState } from "react";
import {
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Lock,
  Moon,
  RotateCcw,
  Save,
  ShieldCheck,
  Sun,
  Trash2,
  User,
  UserPlus,
  Volume2,
  VolumeX,
} from "lucide-react";
import { setAdminName, useAdminName, useTheme } from "@/src/lib/settings";
import { useAuth } from "@/src/lib/auth";
import {
  playHoverSound,
  playMechanicalKey,
  playSound,
  SOUND_PROFILES,
  speakBranch,
  useSoundSettings,
  type SoundKind,
} from "@/src/lib/sound";
import { BRANCHES, clearAllStudents, resetDemoStudents } from "@/src/lib/students";
import { MagneticButton, SpotlightCard } from "@/src/components/InteractiveSurface";

const TEST_PADS: { kind: SoundKind; label: string; hint: string }[] = [
  { kind: "click", label: "Standard Click", hint: "Buttons & controls" },
  { kind: "nav", label: "Navigation", hint: "Tabs & routes" },
  { kind: "toggle", label: "Toggle Switch", hint: "Status & mode flips" },
  { kind: "success", label: "Save Chime", hint: "Record saved" },
  { kind: "soft", label: "Soft Surface Tap", hint: "Background click" },
  { kind: "delete", label: "Remove Alert", hint: "Record deleted" },
];

export function SettingsPage({ onNotify }: { onNotify: (msg: string) => void }) {
  const {
    admin,
    adminAccounts,
    updateCredentials,
    createAdminAccount,
    deleteAdminAccount,
  } = useAuth();
  const adminName = useAdminName();
  const [nameInput, setNameInput] = useState(adminName);
  const [theme, setTheme] = useTheme();
  const {
    settings,
    setEnabled,
    setVolume,
    setProfile,
    setClickAnywhere,
    setHoverEnabled,
    setTypingEnabled,
  } = useSoundSettings();
  const [confirmClear, setConfirmClear] = useState(false);
  const [dataBusy, setDataBusy] = useState(false);

  // Change current admin username & password
  const [currentPassword, setCurrentPassword] = useState("");
  const [nextUsername, setNextUsername] = useState(admin?.username ?? "");
  const [nextPassword, setNextPassword] = useState("");
  const [confirmNextPassword, setConfirmNextPassword] = useState("");
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [credError, setCredError] = useState<string | null>(null);
  const [credBusy, setCredBusy] = useState(false);

  // Create additional admin username & password
  const [extraUsername, setExtraUsername] = useState("");
  const [extraPassword, setExtraPassword] = useState("");
  const [showExtraPw, setShowExtraPw] = useState(false);
  const [adminError, setAdminError] = useState<string | null>(null);
  const [adminBusy, setAdminBusy] = useState(false);

  useEffect(() => {
    if (admin?.username) {
      setNextUsername(admin.username);
    }
  }, [admin?.username]);

  const handleSaveName = (e: React.FormEvent) => {
    e.preventDefault();
    setAdminName(nameInput);
    playSound("success");
    onNotify("Dashboard admin name updated");
  };

  const handleUpdateCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    if (credBusy) return;
    setCredError(null);

    if (!currentPassword) {
      setCredError("Please enter your current password to confirm changes.");
      playSound("delete");
      return;
    }
    if (nextPassword && nextPassword.length < 6) {
      setCredError("New password must be at least 6 characters.");
      playSound("delete");
      return;
    }
    if (nextPassword && nextPassword !== confirmNextPassword) {
      setCredError("New password and confirmation do not match.");
      playSound("delete");
      return;
    }

    setCredBusy(true);
    try {
      const res = await updateCredentials(currentPassword, nextUsername, nextPassword);
      if (!res.ok) {
        playSound("delete");
        setCredError(res.error);
        return;
      }
      playSound("success");
      setCurrentPassword("");
      setNextPassword("");
      setConfirmNextPassword("");
      onNotify(
        nextPassword
          ? `Admin username (@${nextUsername.trim()}) and password updated`
          : `Admin username updated to @${nextUsername.trim()}`
      );
    } finally {
      setCredBusy(false);
    }
  };

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (adminBusy) return;
    setAdminBusy(true);
    setAdminError(null);
    try {
      const res = await createAdminAccount(extraUsername, extraPassword);
      if (!res.ok) {
        playSound("delete");
        setAdminError(res.error);
        return;
      }
      playSound("success");
      onNotify(`Created admin account @${extraUsername.trim()}`);
      setExtraUsername("");
      setExtraPassword("");
    } finally {
      setAdminBusy(false);
    }
  };

  const handleDeleteAdmin = async (id: string, username: string) => {
    if (adminBusy) return;
    setAdminBusy(true);
    setAdminError(null);
    try {
      const res = await deleteAdminAccount(id);
      if (!res.ok) {
        playSound("delete");
        setAdminError(res.error);
        return;
      }
      playSound("delete");
      onNotify(`Removed admin account @${username}`);
    } finally {
      setAdminBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 animate-rise">
      <div>
        <h1 className="font-display text-2xl font-bold text-[var(--foreground)] sm:text-3xl">
          Settings & Click Audio Studio
        </h1>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          Customize acoustic click feedback, visual theme, admin username &amp; password, and saved records.
        </p>
      </div>

      {/* Sound Studio */}
      <SpotlightCard as="section" tilt={false} className="space-y-6 rounded-2xl p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--border)] pb-5">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-xl border border-cyan-400/30 bg-cyan-500/14 text-cyan-600 dark:text-cyan-300">
              {settings.enabled ? <Volume2 className="size-5" /> : <VolumeX className="size-5" />}
            </div>
            <div>
              <h2 className="font-display text-base font-semibold text-[var(--foreground)]">
                Interactive Click Sound
              </h2>
              <p className="text-xs text-[var(--muted-foreground)]">
                Real-time synthesized Web Audio feedback whenever a click is made
              </p>
            </div>
          </div>

          <MagneticButton
            type="button"
            onClick={() => setEnabled(!settings.enabled)}
            className={`rounded-xl px-4 py-2 text-xs font-semibold whitespace-nowrap ${
              settings.enabled
                ? "btn-futuristic"
                : "btn-glass-glow text-[var(--foreground)]"
            }`}
          >
            {settings.enabled ? "Sound Enabled" : "Sound Muted"}
          </MagneticButton>
        </div>

        {/* Volume & Click Anywhere */}
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <div className="flex items-center justify-between text-xs">
              <label className="font-medium text-[var(--foreground)]">Master Volume</label>
              <span className="font-mono tabular-nums text-[var(--muted-foreground)]">
                {Math.round(settings.volume * 100)}%
              </span>
            </div>
            <input
              type="range"
              min={0.1}
              max={1}
              step={0.05}
              value={settings.volume}
              onChange={(e) => setVolume(Number(e.target.value))}
              onMouseUp={() => playSound("click")}
              onTouchEnd={() => playSound("click")}
              className="mt-2.5 w-full accent-sky-500"
            />
          </div>

          <div className="flex items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-hover)] px-4 py-3">
            <div>
              <p className="text-xs font-medium text-[var(--foreground)]">Click Anywhere Audio</p>
              <p className="mt-0.5 text-[11px] text-[var(--muted-foreground)]">
                Play a subtle tap even on neutral background clicks
              </p>
            </div>
            <button
              type="button"
              onClick={() => setClickAnywhere(!settings.clickAnywhere)}
              aria-label="Toggle click anywhere audio"
              className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${
                settings.clickAnywhere ? "bg-sky-500" : "bg-slate-400/40 dark:bg-slate-700"
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 size-4 rounded-full bg-white shadow-xs transition-transform ${
                  settings.clickAnywhere ? "translate-x-4" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-hover)] px-4 py-3 sm:col-span-2">
            <div>
              <p className="text-xs font-medium text-[var(--foreground)]">
                Smooth Cursor Hover &amp; Glide Audio
              </p>
              <p className="mt-0.5 text-[11px] text-[var(--muted-foreground)]">
                Play gentle pentatonic chimes as your cursor moves across pages, cards, and buttons
              </p>
            </div>
            <div className="flex items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => playHoverSound("nav", true)}
                className="text-[11px] font-medium text-[var(--accent)] hover:underline whitespace-nowrap"
              >
                Preview
              </button>
              <button
                type="button"
                onClick={() => setHoverEnabled(!settings.hoverEnabled)}
                aria-label="Toggle smooth cursor hover audio"
                className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${
                  settings.hoverEnabled ? "bg-sky-500" : "bg-slate-400/40 dark:bg-slate-700"
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 size-4 rounded-full bg-white shadow-xs transition-transform ${
                    settings.hoverEnabled ? "translate-x-4" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-hover)] px-4 py-3 sm:col-span-2">
            <div>
              <p className="text-xs font-medium text-[var(--foreground)]">
                Mechanical Keyboard Typing Sound
              </p>
              <p className="mt-0.5 text-[11px] text-[var(--muted-foreground)]">
                Tactile mechanical switch clicks &amp; keycap thock whenever you type in any field
              </p>
            </div>
            <div className="flex items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => playMechanicalKey("a", true)}
                className="text-[11px] font-medium text-[var(--accent)] hover:underline whitespace-nowrap"
              >
                Preview
              </button>
              <button
                type="button"
                onClick={() => setTypingEnabled(!settings.typingEnabled)}
                aria-label="Toggle mechanical keyboard typing sound"
                className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${
                  settings.typingEnabled ? "bg-sky-500" : "bg-slate-400/40 dark:bg-slate-700"
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 size-4 rounded-full bg-white shadow-xs transition-transform ${
                    settings.typingEnabled ? "translate-x-4" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Acoustic Profile Picker */}
        <div>
          <p className="text-xs font-medium text-[var(--muted-foreground)]">Acoustic Profile</p>
          <div className="mt-2.5 grid gap-3 sm:grid-cols-2">
            {SOUND_PROFILES.map((p) => {
              const active = settings.profile === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    if (!settings.enabled) setEnabled(true);
                    setProfile(p.id);
                  }}
                  className={`rounded-xl border p-3.5 text-left transition-colors ${
                    active
                      ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                      : "border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-hover)]"
                  }`}
                >
                  <p className="text-sm font-semibold text-[var(--foreground)]">{p.label}</p>
                  <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">{p.description}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Interactive Sound Test Pads */}
        <div>
          <p className="text-xs font-medium text-[var(--muted-foreground)]">
            Preview Sound Effects
          </p>
          <div className="mt-2.5 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            {TEST_PADS.map((pad) => (
              <button
                key={pad.kind}
                type="button"
                onClick={() => playSound(pad.kind, true)}
                className="btn-glass-glow rounded-xl px-3.5 py-3 text-left"
              >
                <p className="text-xs font-semibold text-[var(--foreground)]">{pad.label}</p>
                <p className="mt-0.5 text-[11px] text-[var(--muted-foreground)]">{pad.hint}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Branch Voice Pronunciation Preview */}
        <div>
          <p className="text-xs font-medium text-[var(--muted-foreground)]">
            Branch Voice Audio (Click any branch)
          </p>
          <div className="mt-2.5 grid grid-cols-4 gap-2 sm:grid-cols-8">
            {BRANCHES.map((branch) => (
              <button
                key={branch}
                type="button"
                onClick={() => speakBranch(branch, true)}
                className="btn-glass-glow rounded-xl px-2 py-2.5 text-center font-mono text-xs font-semibold text-[var(--foreground)] whitespace-nowrap"
              >
                {branch}
              </button>
            ))}
          </div>
        </div>
      </SpotlightCard>

      {/* Profile & Appearance */}
      <div className="grid gap-6 sm:grid-cols-2">
        <SpotlightCard tilt maxTilt={3} className="rounded-2xl">
          <form onSubmit={handleSaveName} className="flex h-full flex-col justify-between p-6">
            <div>
              <h2 className="font-display text-base font-semibold text-[var(--foreground)]">
                Admin Greeting
              </h2>
              <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                Displayed in the Dashboard overview header.
              </p>
              <input
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                placeholder="Your name"
                className="mt-4 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2.5 text-sm text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none"
              />
            </div>
            <MagneticButton
              type="submit"
              className="btn-futuristic mt-4 inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold whitespace-nowrap"
            >
              <Save className="size-3.5" />
              <span>Save Name</span>
            </MagneticButton>
          </form>
        </SpotlightCard>

        <SpotlightCard tilt maxTilt={3} className="flex flex-col justify-between rounded-2xl p-6">
          <div>
            <h2 className="font-display text-base font-semibold text-[var(--foreground)]">
              Interface Atmosphere
            </h2>
            <p className="mt-1 text-xs text-[var(--muted-foreground)]">
              Switch between Obsidian Dark and Daylight Studio palettes.
            </p>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => {
                playSound("toggle");
                setTheme("dark");
              }}
              className={`flex items-center justify-center gap-2 rounded-xl border py-3 text-xs font-semibold transition-all active:scale-[0.98] ${
                theme === "dark"
                  ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)] shadow-[0_0_20px_-8px_rgba(34,211,238,0.45)]"
                  : "border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--surface-hover)]"
              }`}
            >
              <Moon className="size-4" />
              <span>Obsidian</span>
            </button>
            <button
              type="button"
              onClick={() => {
                playSound("toggle");
                setTheme("light");
              }}
              className={`flex items-center justify-center gap-2 rounded-xl border py-3 text-xs font-semibold transition-all active:scale-[0.98] ${
                theme === "light"
                  ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
                  : "border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--surface-hover)]"
              }`}
            >
              <Sun className="size-4" />
              <span>Daylight</span>
            </button>
          </div>
        </SpotlightCard>
      </div>

      {/* Admin Username & Password Management */}
      <SpotlightCard as="section" tilt={false} className="space-y-6 rounded-2xl p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] pb-4">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-xl border border-emerald-400/30 bg-emerald-500/14 text-emerald-500 dark:text-emerald-300">
              <ShieldCheck className="size-5" />
            </div>
            <div>
              <h2 className="font-display text-base font-semibold text-[var(--foreground)]">
                Admin Username &amp; Password
              </h2>
              <p className="text-xs text-[var(--muted-foreground)]">
                Change your admin username or password, or create additional admin logins (no email required)
              </p>
            </div>
          </div>
          {admin?.username && (
            <span className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1 font-mono text-[11px] text-[var(--muted-foreground)]">
              Signed in: @{admin.username}
            </span>
          )}
        </div>

        {/* Change Own Username / Password */}
        <form onSubmit={handleUpdateCredentials} className="space-y-4">
          <p className="text-xs font-semibold tracking-wide text-[var(--muted-foreground)] uppercase">
            Update Your Login Credentials
          </p>

          {credError && (
            <div
              role="alert"
              className="rounded-xl border border-red-500/35 bg-red-500/12 px-3.5 py-2.5 text-xs font-medium text-red-600 dark:text-red-300"
            >
              {credError}
            </div>
          )}

          <div className="grid gap-3.5 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-[var(--muted-foreground)]">
                Admin Username
              </label>
              <div className="relative mt-1.5">
                <User className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-[var(--muted-foreground)]" />
                <input
                  type="text"
                  required
                  minLength={3}
                  maxLength={32}
                  disabled={credBusy}
                  value={nextUsername}
                  onChange={(e) => {
                    setNextUsername(e.target.value);
                    setCredError(null);
                  }}
                  placeholder="admin"
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] py-2 pr-3 pl-9 text-xs text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--muted-foreground)]">
                Current Password (Required)
              </label>
              <div className="relative mt-1.5">
                <Lock className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-[var(--muted-foreground)]" />
                <input
                  type={showCurrentPw ? "text" : "password"}
                  required
                  disabled={credBusy}
                  value={currentPassword}
                  onChange={(e) => {
                    setCurrentPassword(e.target.value);
                    setCredError(null);
                  }}
                  placeholder="Enter current password"
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] py-2 pr-9 pl-9 text-xs text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPw((v) => !v)}
                  aria-label={showCurrentPw ? "Hide current password" : "Show current password"}
                  className="absolute top-1/2 right-2 grid size-6 -translate-y-1/2 place-items-center rounded text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                >
                  {showCurrentPw ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--muted-foreground)]">
                New Password (Optional)
              </label>
              <div className="relative mt-1.5">
                <KeyRound className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-[var(--muted-foreground)]" />
                <input
                  type={showNewPw ? "text" : "password"}
                  minLength={6}
                  disabled={credBusy}
                  value={nextPassword}
                  onChange={(e) => {
                    setNextPassword(e.target.value);
                    setCredError(null);
                  }}
                  placeholder="Leave blank to keep current"
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] py-2 pr-9 pl-9 text-xs text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPw((v) => !v)}
                  aria-label={showNewPw ? "Hide new password" : "Show new password"}
                  className="absolute top-1/2 right-2 grid size-6 -translate-y-1/2 place-items-center rounded text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                >
                  {showNewPw ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--muted-foreground)]">
                Confirm New Password
              </label>
              <div className="relative mt-1.5">
                <KeyRound className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-[var(--muted-foreground)]" />
                <input
                  type={showNewPw ? "text" : "password"}
                  disabled={credBusy}
                  value={confirmNextPassword}
                  onChange={(e) => {
                    setConfirmNextPassword(e.target.value);
                    setCredError(null);
                  }}
                  placeholder="Re-enter new password"
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] py-2 pr-3 pl-9 text-xs text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <MagneticButton
              type="submit"
              disabled={credBusy}
              className="btn-futuristic inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold whitespace-nowrap disabled:opacity-60"
            >
              {credBusy ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
              <span>{credBusy ? "Updating..." : "Save Username & Password"}</span>
            </MagneticButton>
          </div>
        </form>

        {/* Manage / Create Additional Admin Accounts */}
        <div className="space-y-3 border-t border-[var(--border)] pt-5">
          <p className="text-xs font-semibold tracking-wide text-[var(--muted-foreground)] uppercase">
            Admin Accounts ({adminAccounts.length})
          </p>

          {adminError && (
            <div
              role="alert"
              className="rounded-xl border border-red-500/35 bg-red-500/12 px-3.5 py-2.5 text-xs font-medium text-red-600 dark:text-red-300"
            >
              {adminError}
            </div>
          )}

          {adminAccounts.length > 0 && (
            <ul className="divide-y divide-[var(--border)] rounded-xl border border-[var(--border)] bg-[var(--surface)]">
              {adminAccounts.map((acc) => {
                const isSelf = acc.id === admin?.id;
                return (
                  <li
                    key={acc.id}
                    className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 text-sm"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="truncate font-mono text-xs font-semibold text-[var(--foreground)]">
                        @{acc.username}
                      </span>
                      {isSelf && (
                        <span className="rounded-md bg-cyan-500/15 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-cyan-600 dark:text-cyan-300 uppercase">
                          Current
                        </span>
                      )}
                    </div>
                    {!isSelf && (
                      <button
                        type="button"
                        disabled={adminBusy}
                        onClick={() => void handleDeleteAdmin(acc.id, acc.username)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/25 px-3 py-1 text-xs font-medium text-red-600 transition-colors hover:bg-red-500/10 dark:text-red-400 disabled:opacity-50"
                      >
                        <Trash2 className="size-3" />
                        <span>Remove</span>
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          <form onSubmit={handleCreateAdmin} className="grid gap-3 sm:grid-cols-12">
            <input
              type="text"
              required
              minLength={3}
              maxLength={32}
              disabled={adminBusy}
              value={extraUsername}
              onChange={(e) => {
                setExtraUsername(e.target.value);
                setAdminError(null);
              }}
              placeholder="New admin username"
              className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2 text-xs text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:border-[var(--accent)] focus:outline-none sm:col-span-4"
            />
            <div className="relative sm:col-span-5">
              <input
                type={showExtraPw ? "text" : "password"}
                required
                minLength={6}
                disabled={adminBusy}
                value={extraPassword}
                onChange={(e) => {
                  setExtraPassword(e.target.value);
                  setAdminError(null);
                }}
                placeholder="Password (min 6 chars)"
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] py-2 pr-9 pl-3.5 text-xs text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:border-[var(--accent)] focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowExtraPw((v) => !v)}
                aria-label={showExtraPw ? "Hide password" : "Show password"}
                className="absolute top-1/2 right-2 grid size-6 -translate-y-1/2 place-items-center rounded text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              >
                {showExtraPw ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
              </button>
            </div>
            <MagneticButton
              type="submit"
              disabled={adminBusy}
              className="btn-futuristic inline-flex items-center justify-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold whitespace-nowrap disabled:opacity-60 sm:col-span-3"
            >
              {adminBusy ? <Loader2 className="size-3.5 animate-spin" /> : <UserPlus className="size-3.5" />}
              <span>Add Admin</span>
            </MagneticButton>
          </form>
        </div>
      </SpotlightCard>

      {/* Persistent Database Management */}
      <SpotlightCard
        as="section"
        tilt={false}
        className="flex flex-col justify-between gap-4 rounded-2xl p-6 sm:flex-row sm:items-center"
      >
        <div>
          <h2 className="font-display text-base font-semibold text-[var(--foreground)]">
            Persistent Student Database
          </h2>
          <p className="mt-1 text-xs text-[var(--muted-foreground)]">
            Restore the sample MITS dataset or clear all saved records on the server.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            disabled={dataBusy}
            onClick={async () => {
              setDataBusy(true);
              try {
                await resetDemoStudents();
                playSound("success");
                setConfirmClear(false);
                onNotify("Demo student dataset restored");
              } catch {
                playSound("delete");
                onNotify("Failed to restore demo dataset");
              } finally {
                setDataBusy(false);
              }
            }}
            className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-xs font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--surface-hover)] disabled:opacity-50 whitespace-nowrap"
          >
            {dataBusy ? <Loader2 className="size-3.5 animate-spin" /> : <RotateCcw className="size-3.5" />}
            <span>Restore Demo Data</span>
          </button>

          {!confirmClear ? (
            <button
              type="button"
              disabled={dataBusy}
              onClick={() => {
                playSound("click");
                setConfirmClear(true);
              }}
              className="inline-flex items-center gap-2 rounded-xl border border-red-500/25 px-4 py-2 text-xs font-medium text-red-600 transition-colors hover:bg-red-500/10 dark:text-red-400 disabled:opacity-50 whitespace-nowrap"
            >
              <Trash2 className="size-3.5" />
              <span>Clear All</span>
            </button>
          ) : (
            <button
              type="button"
              disabled={dataBusy}
              onClick={async () => {
                setDataBusy(true);
                try {
                  await clearAllStudents();
                  playSound("delete");
                  setConfirmClear(false);
                  onNotify("All student records cleared");
                } catch {
                  playSound("delete");
                  onNotify("Failed to clear student records");
                } finally {
                  setDataBusy(false);
                }
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-500 disabled:opacity-50 whitespace-nowrap"
            >
              {dataBusy ? "Clearing..." : "Confirm Clear All"}
            </button>
          )}
        </div>
      </SpotlightCard>
    </div>
  );
}
