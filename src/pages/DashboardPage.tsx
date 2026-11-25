import { useState } from "react";
import {
  ArrowRight,
  Building2,
  Download,
  Search,
  Sparkles,
  Trophy,
  UserCheck,
  UserPlus,
  Users,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useCountUp } from "@/src/hooks/use-count-up";
import { useAdminName } from "@/src/lib/settings";
import { playSound, speakBranch } from "@/src/lib/sound";
import {
  BRANCHES,
  computeStats,
  RECENT_DAYS,
  useStudents,
  type Branch,
  type Student,
} from "@/src/lib/students";
import { exportDepartmentPdf } from "@/src/lib/pdfExport";
import { EmptyState, GradeBadge, StatusLabel, StudentAvatar } from "@/src/components/StudentUI";
import { MagneticButton, SpotlightCard } from "@/src/components/InteractiveSurface";
import type { RouteId } from "@/src/components/AppShell";

const tooltipStyle = {
  borderRadius: 12,
  border: "1px solid var(--border-strong)",
  background: "var(--popover)",
  color: "var(--foreground)",
  fontSize: 12,
  boxShadow: "0 16px 36px -12px rgba(0,0,0,0.55), 0 0 18px -6px rgba(34,211,238,0.22)",
};

const GRADE_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--destructive)",
];

function StatCard({
  icon: Icon,
  label,
  value,
  suffix,
  hint,
  iconTone,
  ambientGlow,
  backgroundImage,
  backgroundAlt,
  delay,
  onClick,
}: {
  icon: typeof Users;
  label: string;
  value: number;
  suffix?: string;
  hint: string;
  iconTone: string;
  ambientGlow: string;
  backgroundImage: string;
  backgroundAlt: string;
  delay: number;
  onClick: () => void;
}) {
  const animated = useCountUp(value);
  return (
    <SpotlightCard
      as="button"
      tilt
      maxTilt={5.5}
      onClick={onClick}
      className="group w-full overflow-hidden rounded-2xl border border-cyan-400/25 p-0 text-left shadow-[0_14px_34px_-16px_rgba(0,0,0,0.75)] animate-rise active:scale-[0.985]"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="relative h-full w-full overflow-hidden rounded-2xl p-5">
        <img
          src={backgroundImage}
          alt={backgroundAlt}
          referrerPolicy="no-referrer"
          className="pointer-events-none absolute inset-0 z-0 h-full w-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-105"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-[1]"
          style={{
            background:
              "linear-gradient(115deg, rgba(4, 8, 22, 0.84) 0%, rgba(4, 10, 26, 0.54) 52%, rgba(4, 10, 26, 0.24) 100%)",
          }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-10 -top-10 z-[2] size-32 rounded-full opacity-25 blur-2xl transition-opacity duration-300 group-hover:opacity-55"
          style={{ background: ambientGlow }}
        />
        <div className="relative z-10">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium text-cyan-100/90 drop-shadow-sm transition-colors group-hover:text-white">
              {label}
            </p>
            <div
              className={`grid size-10 shrink-0 place-items-center rounded-xl border backdrop-blur-md transition-all duration-200 group-hover:scale-110 group-hover:shadow-[0_0_20px_-4px_rgba(34,211,238,0.55)] ${iconTone}`}
            >
              <Icon className="size-4" />
            </div>
          </div>
          <p className="mt-4 font-display text-4xl font-bold tabular-nums text-white drop-shadow-sm">
            {Math.round(animated)}
            {suffix && (
              <span className="ml-1.5 text-base font-medium text-cyan-100/80">
                {suffix}
              </span>
            )}
          </p>
          <p className="mt-1.5 text-xs text-slate-200/85 drop-shadow-sm">{hint}</p>
        </div>
      </div>
    </SpotlightCard>
  );
}

export function DashboardPage({
  onNavigate,
  onSelectStudent,
  onFilterBranch,
  onNotify,
}: {
  onNavigate: (route: RouteId) => void;
  onSelectStudent: (student: Student) => void;
  onFilterBranch: (branch: Branch | "ALL") => void;
  onNotify: (message: string) => void;
}) {
  const students = useStudents();
  const adminName = useAdminName();
  const st = computeStats(students);
  const [exportBranch, setExportBranch] = useState<Branch | "ALL">("CSE");
  const [exportingPdf, setExportingPdf] = useState(false);

  const selectedBranchCount =
    exportBranch === "ALL"
      ? st.total
      : st.byBranch.find((b) => b.branch === exportBranch)?.count ?? 0;

  const handleExportDepartment = async () => {
    if (exportingPdf) return;
    setExportingPdf(true);
    try {
      const count = await exportDepartmentPdf(students, exportBranch);
      if (count === 0) {
        playSound("soft");
        onNotify(`No students found in ${exportBranch} to export`);
        return;
      }
      playSound("success");
      const scope = exportBranch === "ALL" ? "all departments" : exportBranch;
      onNotify(`Exported ${count} ${scope} student ${count === 1 ? "record" : "records"} as PDF`);
    } finally {
      setExportingPdf(false);
    }
  };

  const recent = [...students].sort((a, b) => b.createdAt - a.createdAt).slice(0, 6);
  const top = [...students].sort((a, b) => b.marks - a.marks).slice(0, 4);

  const buckets = [
    { range: "0–39", count: students.filter((s) => s.marks < 40).length },
    { range: "40–59", count: students.filter((s) => s.marks >= 40 && s.marks < 60).length },
    { range: "60–69", count: students.filter((s) => s.marks >= 60 && s.marks < 70).length },
    { range: "70–79", count: students.filter((s) => s.marks >= 70 && s.marks < 80).length },
    { range: "80–89", count: students.filter((s) => s.marks >= 80 && s.marks < 90).length },
    { range: "90–100", count: students.filter((s) => s.marks >= 90).length },
  ];

  const nonZeroGrades = st.grades.filter((g) => g.count > 0);

  return (
    <div className="space-y-6">
      {/* Full-Page Hero Showcase — MITS Emblem, College Title, Futuristic Campus & Welcome to StudentHub */}
      <SpotlightCard
        as="section"
        tilt={false}
        className="group w-full overflow-hidden rounded-2xl border border-cyan-400/30 p-0 shadow-[0_0_52px_-12px_rgba(37,99,235,0.45),0_26px_60px_-24px_rgba(0,0,0,0.9)] animate-rise"
      >
        <div className="relative flex min-h-[82vh] w-full flex-col justify-between overflow-hidden rounded-2xl p-6 sm:min-h-[calc(100vh-6.5rem)] sm:p-10 lg:p-12">
          {/* Full-page uploaded futuristic MITS campus portal background */}
          <img
            src="/assets/aistudio/Futuristic_MITS_Campus_Portal_01f0bd52.png"
            alt="Futuristic MITS campus portal at night"
            referrerPolicy="no-referrer"
            className="pointer-events-none absolute inset-0 z-0 h-full w-full object-cover object-center transition-transform duration-1000 ease-out group-hover:scale-[1.025]"
          />
          {/* Top & bottom contrast scrims keeping center glowing campus architecture completely clear and vivid */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-[1]"
            style={{
              background:
                "linear-gradient(180deg, rgba(4, 7, 18, 0.86) 0%, rgba(4, 7, 18, 0.36) 24%, rgba(4, 7, 18, 0.12) 50%, rgba(4, 7, 18, 0.72) 78%, rgba(4, 7, 18, 0.94) 100%)",
            }}
          />

          {/* Top Institution Logo & College Name Header */}
          <div className="relative z-10 flex items-center gap-4 sm:gap-5">
            <div className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-2xl bg-white/95 p-1.5 shadow-[0_10px_28px_rgba(0,0,0,0.5),0_0_24px_rgba(34,211,238,0.28)] ring-1 ring-white/50 sm:size-18 sm:p-2">
              <img
                src="/assets/aistudio/Madhav_Institute_of_Technology_and_Science_logo_f02501a3.png"
                alt="Madhav Institute of Technology & Science, Gwalior emblem"
                referrerPolicy="no-referrer"
                className="h-full w-full object-contain"
              />
            </div>
            <div className="min-w-0">
              <h1 className="font-display text-xl font-bold leading-tight tracking-tight text-white drop-shadow-sm sm:text-3xl lg:text-4xl">
                Madhav Institute of Technology &amp; Science, Gwalior
              </h1>
              <p className="mt-1 text-xs font-medium text-cyan-200/90 sm:text-sm">
                StudentHub · Official Student Directory &amp; Academic Analytics
              </p>
            </div>
          </div>

          {/* Bottom Welcome to StudentHub Content & Actions */}
          <div className="relative z-10 mt-10 flex w-full flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl">
              <p className="text-xs font-medium text-cyan-200/95 sm:text-sm">
                Hi {adminName} · MITS Gwalior
              </p>
              <h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-white drop-shadow-sm sm:text-5xl lg:text-6xl">
                Welcome to{" "}
                <span className="bg-gradient-to-r from-cyan-300 via-sky-300 to-violet-300 bg-clip-text text-transparent">
                  StudentHub
                </span>
              </h2>
              <p className="mt-3 text-base font-medium text-slate-100 sm:text-xl">
                Find any student by one click.
              </p>
              <p className="mt-2.5 max-w-xl text-sm leading-relaxed text-slate-200/95 sm:text-base">
                Average score stands at{" "}
                <span className="font-mono font-semibold tabular-nums text-white">
                  {st.average}
                </span>{" "}
                with a{" "}
                <span className="font-mono font-semibold tabular-nums text-white">
                  {st.passRate}%
                </span>{" "}
                pass rate across{" "}
                <span className="font-semibold text-white">
                  {st.departments} departments
                </span>
                .
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <MagneticButton
                type="button"
                onClick={() => {
                  playSound("nav");
                  onNavigate("add");
                }}
                className="btn-futuristic inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold whitespace-nowrap shrink-0"
              >
                <UserPlus className="size-4" />
                <span>Add Student</span>
              </MagneticButton>
              <MagneticButton
                type="button"
                onClick={() => {
                  playSound("nav");
                  onNavigate("search");
                }}
                className="inline-flex items-center gap-2 rounded-xl border border-white/25 bg-slate-950/65 px-6 py-3 text-sm font-medium text-white backdrop-blur-md transition-all hover:border-cyan-300/60 hover:bg-slate-900/80 hover:shadow-[0_0_24px_-6px_rgba(34,211,238,0.5)] active:scale-[0.97] whitespace-nowrap shrink-0"
              >
                <Search className="size-4" />
                <span>Search</span>
              </MagneticButton>
            </div>
          </div>
        </div>
      </SpotlightCard>

      {/* 4 KPI Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={Users}
          label="Total Students"
          value={st.total}
          hint="All records in StudentHub"
          iconTone="border-cyan-300/40 bg-slate-950/55 text-cyan-300"
          ambientGlow="radial-gradient(circle, rgba(34, 211, 238, 0.55) 0%, transparent 70%)"
          backgroundImage="/assets/aistudio/Futuristic_Neon_Campus_Technology_Banner-2_364c384c.png"
          backgroundAlt="Futuristic neon MITS campus banner"
          delay={60}
          onClick={() => {
            playSound("nav");
            onFilterBranch("ALL");
            onNavigate("students");
          }}
        />
        <StatCard
          icon={UserCheck}
          label="Active Students"
          value={st.active}
          hint={`${st.total - st.active} inactive`}
          iconTone="border-blue-300/40 bg-slate-950/55 text-blue-300"
          ambientGlow="radial-gradient(circle, rgba(59, 130, 246, 0.55) 0%, transparent 70%)"
          backgroundImage="/assets/aistudio/Futuristic_Neon_Education_Campus-4_4e0ceba5.png"
          backgroundAlt="Futuristic neon education campus with glowing books and graduation cap"
          delay={120}
          onClick={() => {
            playSound("nav");
            onFilterBranch("ALL");
            onNavigate("students");
          }}
        />
        <StatCard
          icon={Building2}
          label="Departments"
          value={st.departments}
          suffix={`/ ${BRANCHES.length}`}
          hint="With at least one student"
          iconTone="border-violet-300/40 bg-slate-950/55 text-violet-300"
          ambientGlow="radial-gradient(circle, rgba(139, 92, 246, 0.55) 0%, transparent 70%)"
          backgroundImage="/assets/aistudio/Holographic_Graduation_in_Neon_Blue-5_692484fc.png"
          backgroundAlt="Holographic graduation cap and diploma over campus in neon blue"
          delay={180}
          onClick={() => {
            playSound("nav");
            onFilterBranch("ALL");
            onNavigate("students");
          }}
        />
        <StatCard
          icon={Sparkles}
          label="Recently Added"
          value={st.recent}
          hint={`In the last ${RECENT_DAYS} days`}
          iconTone="border-purple-300/40 bg-slate-950/55 text-purple-300"
          ambientGlow="radial-gradient(circle, rgba(168, 85, 247, 0.55) 0%, transparent 70%)"
          backgroundImage="/assets/aistudio/Neon_Cyan_Futuristic_Gridscape-6_cc9f0d2a.png"
          backgroundAlt="Neon cyan futuristic gridscape and campus skyline"
          delay={240}
          onClick={() => {
            playSound("nav");
            onFilterBranch("ALL");
            onNavigate("students");
          }}
        />
      </div>

      {/* Charts Row 1: Department Enrollment & Grade Distribution */}
      <div className="grid gap-4 lg:grid-cols-3">
        <SpotlightCard
          tilt={false}
          className="rounded-2xl p-5 sm:p-6 animate-rise lg:col-span-2"
          style={{ animationDelay: "300ms" }}
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="font-display text-base font-semibold text-[var(--foreground)]">
                Department Insights
              </h2>
              <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">
                {st.total} total enrolled · Click any bar to inspect or export a department PDF with photos
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <select
                aria-label="Select department to export"
                value={exportBranch}
                onChange={(e) => {
                  const next = e.target.value as Branch | "ALL";
                  speakBranch(next);
                  setExportBranch(next);
                }}
                className="rounded-xl border border-[var(--border)] bg-[var(--popover)] px-3 py-1.5 text-xs font-medium text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none"
              >
                {BRANCHES.map((branch) => {
                  const cnt = st.byBranch.find((b) => b.branch === branch)?.count ?? 0;
                  return (
                    <option key={branch} value={branch}>
                      {branch} ({cnt})
                    </option>
                  );
                })}
                <option value="ALL">All Departments ({st.total})</option>
              </select>

              <button
                type="button"
                disabled={selectedBranchCount === 0 || exportingPdf}
                onClick={handleExportDepartment}
                className="btn-glass-glow inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium text-[var(--foreground)] disabled:cursor-not-allowed disabled:opacity-45 whitespace-nowrap shrink-0"
              >
                <Download className="size-3.5 text-[var(--accent)]" />
                <span>{exportingPdf ? "Generating PDF..." : "Export PDF"}</span>
              </button>
            </div>
          </div>

          <div className="mt-5 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={st.byBranch} margin={{ left: -24, right: 8, top: 8 }}>
                <defs>
                  <linearGradient id="barAccentGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--chart-1)" />
                    <stop offset="52%" stopColor="var(--chart-2)" />
                    <stop offset="100%" stopColor="var(--chart-3)" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis
                  dataKey="branch"
                  tickLine={false}
                  axisLine={false}
                  fontSize={12}
                  stroke="var(--muted-foreground)"
                />
                <YAxis
                  allowDecimals={false}
                  tickLine={false}
                  axisLine={false}
                  fontSize={12}
                  stroke="var(--muted-foreground)"
                />
                <Tooltip
                  cursor={{ fill: "var(--accent-soft)", opacity: 0.7 }}
                  contentStyle={tooltipStyle}
                />
                <Bar
                  dataKey="count"
                  name="Students"
                  fill="url(#barAccentGrad)"
                  radius={[8, 8, 2, 2]}
                  maxBarSize={44}
                  animationDuration={750}
                  className="cursor-pointer"
                  onClick={(entry) => {
                    const payload = entry?.payload as { branch?: Branch } | undefined;
                    if (payload?.branch) {
                      speakBranch(payload.branch);
                      onFilterBranch(payload.branch);
                      onNavigate("students");
                    }
                  }}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Clickable Department Sound & Filter Strip */}
          <div className="mt-4 flex flex-wrap items-center gap-1.5 border-t border-[var(--border)] pt-3.5">
            {BRANCHES.map((branch) => {
              const cnt = st.byBranch.find((b) => b.branch === branch)?.count ?? 0;
              return (
                <button
                  key={branch}
                  type="button"
                  onClick={() => {
                    speakBranch(branch);
                    setExportBranch(branch);
                  }}
                  className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap ${
                    exportBranch === branch
                      ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                      : "text-[var(--muted-foreground)] hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)]"
                  }`}
                >
                  {branch}{" "}
                  <span className="font-mono text-[11px] tabular-nums opacity-75">{cnt}</span>
                </button>
              );
            })}
          </div>
        </SpotlightCard>

        <SpotlightCard
          tilt
          maxTilt={3}
          className="rounded-2xl p-5 sm:p-6 animate-rise"
          style={{ animationDelay: "360ms" }}
        >
          <h2 className="font-display text-base font-semibold text-[var(--foreground)]">
            Grade distribution
          </h2>
          <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">
            A+ ≥ 90 · A ≥ 80 · B ≥ 70 · C ≥ 60 · D ≥ 40
          </p>

          <div className="relative mt-3 h-44">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={nonZeroGrades.length ? nonZeroGrades : [{ grade: "None", count: 1 }]}
                  dataKey="count"
                  nameKey="grade"
                  innerRadius={54}
                  outerRadius={76}
                  paddingAngle={nonZeroGrades.length > 1 ? 3 : 0}
                  stroke="none"
                  animationDuration={750}
                >
                  {nonZeroGrades.length > 0 ? (
                    nonZeroGrades.map((g) => (
                      <Cell
                        key={g.grade}
                        fill={GRADE_COLORS[st.grades.findIndex((x) => x.grade === g.grade)]}
                      />
                    ))
                  ) : (
                    <Cell fill="var(--border)" />
                  )}
                </Pie>
                {nonZeroGrades.length > 0 && <Tooltip contentStyle={tooltipStyle} />}
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
              <div>
                <p className="font-display text-2xl font-bold tabular-nums text-[var(--foreground)]">
                  {st.passRate}%
                </p>
                <p className="text-[11px] text-[var(--muted-foreground)]">pass rate</p>
              </div>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-x-3 gap-y-2 border-t border-[var(--border)] pt-3">
            {st.grades.map((g, i) => (
              <div key={g.grade} className="flex items-center gap-2 text-xs">
                <span
                  className="size-2 shrink-0 rounded-full"
                  style={{ background: GRADE_COLORS[i] }}
                />
                <span className="font-mono font-semibold text-[var(--foreground)]">{g.grade}</span>
                <span className="ml-auto font-mono tabular-nums text-[var(--muted-foreground)]">
                  {g.count}
                </span>
              </div>
            ))}
          </div>
        </SpotlightCard>
      </div>

      {/* Charts Row 2: Marks Distribution & Top Performers */}
      <div className="grid gap-4 lg:grid-cols-3">
        <SpotlightCard
          tilt={false}
          className="rounded-2xl p-5 sm:p-6 animate-rise lg:col-span-2"
          style={{ animationDelay: "420ms" }}
        >
          <h2 className="font-display text-base font-semibold text-[var(--foreground)]">
            Marks distribution
          </h2>
          <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">
            Student headcount across score brackets
          </p>
          <div className="mt-5 h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={buckets} margin={{ left: -24, right: 8, top: 8 }}>
                <defs>
                  <linearGradient id="areaAccentGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.5} />
                    <stop offset="55%" stopColor="var(--chart-3)" stopOpacity={0.16} />
                    <stop offset="100%" stopColor="var(--chart-3)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis
                  dataKey="range"
                  tickLine={false}
                  axisLine={false}
                  fontSize={12}
                  stroke="var(--muted-foreground)"
                />
                <YAxis
                  allowDecimals={false}
                  tickLine={false}
                  axisLine={false}
                  fontSize={12}
                  stroke="var(--muted-foreground)"
                />
                <Tooltip contentStyle={tooltipStyle} />
                <Area
                  type="monotone"
                  dataKey="count"
                  name="Students"
                  stroke="var(--chart-1)"
                  strokeWidth={2.5}
                  fill="url(#areaAccentGrad)"
                  animationDuration={800}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </SpotlightCard>

        <SpotlightCard
          tilt
          maxTilt={3.2}
          className="rounded-2xl p-5 sm:p-6 animate-rise"
          style={{ animationDelay: "480ms" }}
        >
          <div className="flex items-center justify-between">
            <h2 className="font-display text-base font-semibold text-[var(--foreground)]">
              Top performers
            </h2>
            <Trophy className="size-4 text-amber-400" aria-hidden="true" />
          </div>

          <ul className="mt-4 divide-y divide-[var(--border)]">
            {top.map((s, i) => (
              <li key={s.roll}>
                <button
                  type="button"
                  onClick={() => {
                    playSound("click");
                    onSelectStudent(s);
                  }}
                  className="row-luminous group flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left -mx-2 active:scale-[0.99]"
                >
                  <span className="w-4 font-mono text-xs tabular-nums text-[var(--muted-foreground)] group-hover:text-[var(--accent)]">
                    {i + 1}
                  </span>
                  <StudentAvatar name={s.name} photo={s.photo} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-[var(--foreground)]">
                      {s.name}
                    </p>
                    <p className="font-mono text-[11px] text-[var(--muted-foreground)] tabular-nums">
                      {s.roll} · {s.branch}
                    </p>
                  </div>
                  <span className="font-display text-base font-bold tabular-nums text-[var(--foreground)] group-hover:text-[var(--accent)]">
                    {s.marks}
                  </span>
                </button>
              </li>
            ))}
            {top.length === 0 && (
              <li className="py-6 text-sm text-[var(--muted-foreground)]">No students yet.</li>
            )}
          </ul>
        </SpotlightCard>
      </div>

      {/* Recent Students Table */}
      <section className="animate-rise" style={{ animationDelay: "540ms" }}>
        <div className="mb-3 flex items-center justify-between gap-4">
          <h2 className="font-display text-base font-semibold text-[var(--foreground)]">
            Recent students
          </h2>
          <button
            type="button"
            onClick={() => {
              playSound("nav");
              onFilterBranch("ALL");
              onNavigate("students");
            }}
            className="group inline-flex items-center gap-1 text-sm font-medium text-[var(--accent)] hover:underline whitespace-nowrap"
          >
            <span>View all</span>
            <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" />
          </button>
        </div>

        {recent.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No students yet"
            text="Add your first student to populate analytics and directory insights."
            action={
              <MagneticButton
                type="button"
                onClick={() => {
                  playSound("nav");
                  onNavigate("add");
                }}
                className="btn-futuristic inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold"
              >
                <UserPlus className="size-4" /> Add student
              </MagneticButton>
            }
          />
        ) : (
          <SpotlightCard tilt={false} className="overflow-x-auto rounded-2xl">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] text-left text-xs text-[var(--muted-foreground)]">
                  <th className="px-5 py-3.5 font-semibold">Student</th>
                  <th className="px-5 py-3.5 font-semibold">Department</th>
                  <th className="hidden px-5 py-3.5 font-semibold sm:table-cell">Added</th>
                  <th className="px-5 py-3.5 text-right font-semibold">Marks</th>
                  <th className="hidden px-5 py-3.5 font-semibold md:table-cell">Status</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((s) => (
                  <tr
                    key={s.roll}
                    onClick={() => {
                      playSound("click");
                      onSelectStudent(s);
                    }}
                    className="row-luminous cursor-pointer border-b border-[var(--border)] last:border-0"
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <StudentAvatar name={s.name} photo={s.photo} size="sm" />
                        <div className="min-w-0">
                          <p className="whitespace-nowrap font-semibold text-[var(--foreground)]">
                            {s.name}
                          </p>
                          <p className="font-mono text-[11px] tabular-nums text-[var(--muted-foreground)]">
                            {s.roll}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5 text-[var(--muted-foreground)]">
                      {s.branch} · Y{s.year}
                    </td>
                    <td className="hidden whitespace-nowrap px-5 py-3.5 text-[var(--muted-foreground)] tabular-nums sm:table-cell">
                      {new Date(s.createdAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                      })}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="inline-flex items-center justify-end gap-2.5">
                        <span className="font-mono font-semibold tabular-nums text-[var(--foreground)]">
                          {s.marks}
                        </span>
                        <GradeBadge marks={s.marks} />
                      </div>
                    </td>
                    <td className="hidden px-5 py-3.5 md:table-cell">
                      <StatusLabel status={s.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </SpotlightCard>
        )}
      </section>
    </div>
  );
}
