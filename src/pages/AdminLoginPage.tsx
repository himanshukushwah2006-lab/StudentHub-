import { useState } from "react";
import {
  AlertCircle,
  Eye,
  EyeOff,
  Globe,
  KeyRound,
  Loader2,
  Lock,
  ShieldCheck,
  User,
} from "lucide-react";
import { useAuth } from "@/src/lib/auth";
import { playSound } from "@/src/lib/sound";
import { MagneticButton, SpotlightCard } from "@/src/components/InteractiveSurface";

export function AdminLoginPage({
  onOpenPublicPortal,
  onNotify,
}: {
  onOpenPublicPortal: () => void;
  onNotify: (msg: string) => void;
}) {
  const {
    needsSetup,
    submitting,
    authError,
    clearAuthError,
    setupInitialAdmin,
    login,
  } = useAuth();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const displayedError = localError || authError;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    playSound("click");

    if (needsSetup) {
      if (password.length < 6) {
        setLocalError("Password must be at least 6 characters long.");
        playSound("delete");
        return;
      }
      if (password !== confirmPassword) {
        setLocalError("Passwords do not match. Please confirm your password.");
        playSound("delete");
        return;
      }
      const ok = await setupInitialAdmin(username, password);
      if (ok) {
        playSound("success");
        onNotify(`Admin account "${username.trim()}" created — Welcome to MITS StudentHub`);
      } else {
        playSound("delete");
      }
      return;
    }

    const ok = await login(username, password);
    if (ok) {
      playSound("success");
      onNotify(`Signed in as ${username.trim()} — Welcome to MITS StudentHub`);
    } else {
      playSound("delete");
    }
  };

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden px-4 py-10 sm:px-6">
      {/* Subtle futuristic campus backdrop aligned with existing website */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-[5] overflow-hidden">
        <img
          src="/assets/aistudio/Futuristic_MITS_Campus_Portal_01f0bd52.png"
          alt=""
          referrerPolicy="no-referrer"
          className="h-full w-full object-cover object-center opacity-35"
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(circle at 50% 35%, rgba(6, 12, 32, 0.52) 0%, rgba(3, 6, 16, 0.88) 78%, rgba(2, 4, 12, 0.96) 100%)",
          }}
        />
      </div>

      <div className="relative z-10 w-full max-w-md animate-rise">
        {/* Subtle glowing neon perimeter */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -inset-[1.5px] rounded-[1.35rem] bg-gradient-to-br from-cyan-400/55 via-blue-500/35 to-violet-500/55 opacity-75 blur-[6px]"
        />

        <SpotlightCard
          tilt={false}
          className="relative overflow-hidden rounded-2xl border border-cyan-400/35 !bg-slate-950/78 p-7 shadow-[0_28px_72px_-20px_rgba(0,0,0,0.92),0_0_44px_-14px_rgba(34,211,238,0.4)] backdrop-blur-2xl sm:p-8"
        >
          {/* MITS STUDENT HUB Logo & Title */}
          <div className="flex flex-col items-center text-center">
            <div className="grid size-16 place-items-center overflow-hidden rounded-2xl bg-white/95 p-2 shadow-[0_10px_28px_rgba(0,0,0,0.55),0_0_26px_rgba(34,211,238,0.38)] ring-1 ring-cyan-300/60">
              <img
                src="/assets/aistudio/Madhav_Institute_of_Technology_and_Science_logo_f02501a3.png"
                alt="MITS Gwalior Logo"
                referrerPolicy="no-referrer"
                className="h-full w-full object-contain"
              />
            </div>

            <p className="mt-4 font-display text-sm font-bold tracking-[0.22em] text-cyan-200/95 uppercase">
              MITS{" "}
              <span className="bg-gradient-to-r from-cyan-300 via-sky-300 to-violet-300 bg-clip-text text-transparent">
                STUDENT HUB
              </span>
            </p>

            <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-white">
              ADMIN ACCESS
            </h1>
            <p className="mt-1.5 flex items-center gap-1.5 text-xs font-medium tracking-wide text-slate-300/90">
              <ShieldCheck className="size-3.5 text-cyan-300" />
              <span>Authorized Personnel Only</span>
            </p>
          </div>

          {needsSetup && (
            <div className="mt-5 rounded-xl border border-cyan-400/30 bg-cyan-500/12 px-3.5 py-3 text-xs leading-relaxed text-cyan-100">
              <p className="font-semibold text-cyan-200">First-Time Admin Setup</p>
              <p className="mt-0.5 text-cyan-100/85">
                Choose your Admin Username and Password below (no email needed). You can change
                your username or password anytime in Settings.
              </p>
            </div>
          )}

          {displayedError && (
            <div
              role="alert"
              className="mt-5 flex items-start gap-2.5 rounded-xl border border-red-500/40 bg-red-500/14 px-3.5 py-3 text-xs leading-relaxed font-medium text-red-200"
            >
              <AlertCircle className="mt-0.5 size-4 shrink-0 text-red-400" />
              <span>{displayedError}</span>
            </div>
          )}

          {/* Username & Password Form (No Email Required) */}
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label
                htmlFor="admin-username"
                className="block text-xs font-medium text-slate-300"
              >
                {needsSetup ? "Create Admin Username" : "Username"}
              </label>
              <div className="relative mt-1.5">
                <User className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="admin-username"
                  type="text"
                  autoComplete="username"
                  required
                  minLength={3}
                  maxLength={32}
                  disabled={submitting}
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    if (localError) setLocalError(null);
                    if (authError) clearAuthError();
                  }}
                  placeholder={needsSetup ? "e.g. admin or himanshu" : "Enter admin username"}
                  className="w-full rounded-xl border border-white/15 bg-slate-900/80 py-2.5 pr-4 pl-10 text-sm text-white placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none disabled:opacity-60"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="admin-password"
                className="block text-xs font-medium text-slate-300"
              >
                {needsSetup ? "Create Password" : "Password"}
              </label>
              <div className="relative mt-1.5">
                <Lock className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="admin-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete={needsSetup ? "new-password" : "current-password"}
                  required
                  minLength={needsSetup ? 6 : 1}
                  disabled={submitting}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (localError) setLocalError(null);
                    if (authError) clearAuthError();
                  }}
                  placeholder={needsSetup ? "Minimum 6 characters" : "Enter your password"}
                  className="w-full rounded-xl border border-white/15 bg-slate-900/80 py-2.5 pr-11 pl-10 text-sm text-white placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none disabled:opacity-60"
                />
                <button
                  type="button"
                  onClick={() => {
                    playSound("toggle");
                    setShowPassword((prev) => !prev);
                  }}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute top-1/2 right-2.5 grid size-7 -translate-y-1/2 place-items-center rounded-lg text-slate-400 transition-colors hover:bg-white/10 hover:text-cyan-200"
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            {needsSetup && (
              <div>
                <label
                  htmlFor="admin-confirm-password"
                  className="block text-xs font-medium text-slate-300"
                >
                  Confirm Password
                </label>
                <div className="relative mt-1.5">
                  <KeyRound className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-slate-400" />
                  <input
                    id="admin-confirm-password"
                    type={showConfirm ? "text" : "password"}
                    autoComplete="new-password"
                    required
                    minLength={6}
                    disabled={submitting}
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      if (localError) setLocalError(null);
                      if (authError) clearAuthError();
                    }}
                    placeholder="Re-enter your password"
                    className="w-full rounded-xl border border-white/15 bg-slate-900/80 py-2.5 pr-11 pl-10 text-sm text-white placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none disabled:opacity-60"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      playSound("toggle");
                      setShowConfirm((prev) => !prev);
                    }}
                    aria-label={showConfirm ? "Hide confirm password" : "Show confirm password"}
                    className="absolute top-1/2 right-2.5 grid size-7 -translate-y-1/2 place-items-center rounded-lg text-slate-400 transition-colors hover:bg-white/10 hover:text-cyan-200"
                  >
                    {showConfirm ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>
            )}

            <MagneticButton
              type="submit"
              disabled={submitting}
              className="btn-futuristic mt-2 flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold disabled:opacity-65"
            >
              {submitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  <span>{needsSetup ? "Creating Admin..." : "Verifying Credentials..."}</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="size-4" />
                  <span>{needsSetup ? "Create Admin & Sign In" : "Login to Admin Dashboard"}</span>
                </>
              )}
            </MagneticButton>
          </form>

          <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-4 text-xs">
            <span className="text-slate-400">Encrypted Server Session</span>
            <button
              type="button"
              onClick={() => {
                playSound("nav");
                onOpenPublicPortal();
              }}
              className="inline-flex items-center gap-1 font-medium text-cyan-300 hover:underline whitespace-nowrap"
            >
              <Globe className="size-3.5" />
              <span>Public Overview</span>
            </button>
          </div>
        </SpotlightCard>
      </div>
    </div>
  );
}
