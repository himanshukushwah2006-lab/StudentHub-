import { Building2, Lock, ShieldCheck, TrendingUp, UserCheck, Users } from "lucide-react";
import { usePublicStats } from "@/src/lib/students";
import { playSound } from "@/src/lib/sound";
import { MagneticButton, SpotlightCard } from "@/src/components/InteractiveSurface";

export function PublicPortalPage({ onOpenAdminLogin }: { onOpenAdminLogin: () => void }) {
  const stats = usePublicStats();

  return (
    <div className="mx-auto min-h-screen w-full max-w-6xl space-y-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      {/* Full-Page Futuristic Campus Hero (Zero PII) */}
      <SpotlightCard
        as="section"
        tilt={false}
        className="group w-full overflow-hidden rounded-2xl border border-cyan-400/30 p-0 shadow-[0_0_52px_-12px_rgba(37,99,235,0.45),0_26px_60px_-24px_rgba(0,0,0,0.9)] animate-rise"
      >
        <div className="relative flex min-h-[72vh] w-full flex-col justify-between overflow-hidden rounded-2xl p-6 sm:p-10 lg:p-12">
          <img
            src="/assets/aistudio/Futuristic_MITS_Campus_Portal_01f0bd52.png"
            alt="Futuristic MITS campus portal at night"
            referrerPolicy="no-referrer"
            className="pointer-events-none absolute inset-0 z-0 h-full w-full object-cover object-center transition-transform duration-1000 ease-out group-hover:scale-[1.025]"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-[1]"
            style={{
              background:
                "linear-gradient(180deg, rgba(4, 7, 18, 0.86) 0%, rgba(4, 7, 18, 0.36) 26%, rgba(4, 7, 18, 0.14) 50%, rgba(4, 7, 18, 0.76) 78%, rgba(4, 7, 18, 0.94) 100%)",
            }}
          />

          {/* Top Institution Logo & Admin Access Action */}
          <div className="relative z-10 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4 min-w-0">
              <div className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-2xl bg-white/95 p-1.5 shadow-[0_10px_28px_rgba(0,0,0,0.5),0_0_24px_rgba(34,211,238,0.28)] ring-1 ring-white/50 sm:size-16 sm:p-2">
                <img
                  src="/assets/aistudio/Madhav_Institute_of_Technology_and_Science_logo_f02501a3.png"
                  alt="Madhav Institute of Technology & Science, Gwalior emblem"
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-contain"
                />
              </div>
              <div className="min-w-0">
                <h1 className="font-display text-lg font-bold leading-tight tracking-tight text-white drop-shadow-sm sm:text-2xl lg:text-3xl">
                  Madhav Institute of Technology &amp; Science, Gwalior
                </h1>
                <p className="mt-1 text-xs font-medium text-cyan-200/90 sm:text-sm">
                  MITS StudentHub · Public Campus Overview
                </p>
              </div>
            </div>

            <MagneticButton
              type="button"
              onClick={() => {
                playSound("nav");
                onOpenAdminLogin();
              }}
              className="btn-futuristic inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold whitespace-nowrap shrink-0"
            >
              <ShieldCheck className="size-4" />
              <span>Admin Access</span>
            </MagneticButton>
          </div>

          {/* Bottom Public Welcome Copy */}
          <div className="relative z-10 mt-10 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl">
              <p className="inline-flex items-center gap-1.5 text-xs font-medium text-cyan-200/95 sm:text-sm">
                <Lock className="size-3.5 text-cyan-300" />
                <span>Student records are protected · Authorized Admin Login required</span>
              </p>
              <h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-white drop-shadow-sm sm:text-5xl">
                Welcome to{" "}
                <span className="bg-gradient-to-r from-cyan-300 via-sky-300 to-violet-300 bg-clip-text text-transparent">
                  StudentHub
                </span>
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-200/95 sm:text-base">
                Sensitive student directories, academic records, and management tools are secured by
                server-enforced administrator authentication and access controls. Sign in with your
                admin username and password to manage records.
              </p>
            </div>

            <MagneticButton
              type="button"
              onClick={() => {
                playSound("nav");
                onOpenAdminLogin();
              }}
              className="btn-futuristic inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold whitespace-nowrap shrink-0"
            >
              <ShieldCheck className="size-4" />
              <span>Administrator Sign In</span>
            </MagneticButton>
          </div>
        </div>
      </SpotlightCard>

      {/* Non-PII Aggregate Public Metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SpotlightCard tilt maxTilt={4} className="rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[var(--muted-foreground)]">Total Enrolled</span>
            <Users className="size-4 text-cyan-400" />
          </div>
          <p className="mt-3 font-display text-3xl font-bold tabular-nums text-[var(--foreground)]">
            {stats ? stats.total : "—"}
          </p>
          <p className="mt-1 text-xs text-[var(--muted-foreground)]">Verified campus roster</p>
        </SpotlightCard>

        <SpotlightCard tilt maxTilt={4} className="rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[var(--muted-foreground)]">Active Students</span>
            <UserCheck className="size-4 text-blue-400" />
          </div>
          <p className="mt-3 font-display text-3xl font-bold tabular-nums text-[var(--foreground)]">
            {stats ? stats.active : "—"}
          </p>
          <p className="mt-1 text-xs text-[var(--muted-foreground)]">Currently enrolled</p>
        </SpotlightCard>

        <SpotlightCard tilt maxTilt={4} className="rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[var(--muted-foreground)]">Departments</span>
            <Building2 className="size-4 text-violet-400" />
          </div>
          <p className="mt-3 font-display text-3xl font-bold tabular-nums text-[var(--foreground)]">
            {stats ? stats.departments : "—"}
          </p>
          <p className="mt-1 text-xs text-[var(--muted-foreground)]">Active academic branches</p>
        </SpotlightCard>

        <SpotlightCard tilt maxTilt={4} className="rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[var(--muted-foreground)]">Pass Rate</span>
            <TrendingUp className="size-4 text-emerald-400" />
          </div>
          <p className="mt-3 font-display text-3xl font-bold tabular-nums text-[var(--foreground)]">
            {stats ? `${stats.passRate}%` : "—"}
          </p>
          <p className="mt-1 text-xs text-[var(--muted-foreground)]">
            {stats ? `Avg score ${stats.average} / 100` : "Aggregate metric"}
          </p>
        </SpotlightCard>
      </div>
    </div>
  );
}
