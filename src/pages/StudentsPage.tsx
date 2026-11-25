import { useMemo, useState } from "react";
import { Download, Search, SlidersHorizontal, UserPlus, Users } from "lucide-react";
import { playSound, speakBranch } from "@/src/lib/sound";
import {
  BRANCHES,
  toggleStudentStatus,
  useStudents,
  type Branch,
  type Student,
} from "@/src/lib/students";
import { exportStudentsPdf } from "@/src/lib/pdfExport";
import { EmptyState, GradeBadge, StatusLabel, StudentAvatar } from "@/src/components/StudentUI";
import { MagneticButton, SpotlightCard } from "@/src/components/InteractiveSurface";
import type { RouteId } from "@/src/components/AppShell";

type SortKey = "newest" | "marks_desc" | "marks_asc" | "name_asc";

export function StudentsPage({
  branchFilter,
  onBranchFilterChange,
  onNavigate,
  onSelectStudent,
  onNotify,
}: {
  branchFilter: Branch | "ALL";
  onBranchFilterChange: (branch: Branch | "ALL") => void;
  onNavigate: (route: RouteId) => void;
  onSelectStudent: (student: Student) => void;
  onNotify: (msg: string) => void;
}) {
  const students = useStudents();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [yearFilter, setYearFilter] = useState<number | "ALL">("ALL");
  const [sortBy, setSortBy] = useState<SortKey>("newest");
  const [exportingPdf, setExportingPdf] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = students.filter((s) => {
      if (branchFilter !== "ALL" && s.branch !== branchFilter) return false;
      if (statusFilter !== "all" && s.status !== statusFilter) return false;
      if (yearFilter !== "ALL" && s.year !== yearFilter) return false;
      if (q) {
        return (
          s.name.toLowerCase().includes(q) ||
          s.roll.toLowerCase().includes(q) ||
          s.branch.toLowerCase().includes(q) ||
          s.email.toLowerCase().includes(q)
        );
      }
      return true;
    });

    return [...list].sort((a, b) => {
      if (sortBy === "marks_desc") return b.marks - a.marks;
      if (sortBy === "marks_asc") return a.marks - b.marks;
      if (sortBy === "name_asc") return a.name.localeCompare(b.name);
      return b.createdAt - a.createdAt;
    });
  }, [students, branchFilter, statusFilter, yearFilter, query, sortBy]);

  return (
    <div className="space-y-6 animate-rise">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-[var(--foreground)] sm:text-3xl">
            Student Directory
          </h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            Showing{" "}
            <span className="font-mono font-semibold tabular-nums text-[var(--foreground)]">
              {filtered.length}
            </span>{" "}
            of{" "}
            <span className="font-mono font-semibold tabular-nums text-[var(--foreground)]">
              {students.length}
            </span>{" "}
            records · Click any row to view or edit
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <MagneticButton
            type="button"
            disabled={filtered.length === 0 || exportingPdf}
            onClick={async () => {
              if (exportingPdf) return;
              setExportingPdf(true);
              try {
                const label = branchFilter === "ALL" ? undefined : branchFilter;
                await exportStudentsPdf(filtered, label);
                playSound("success");
                onNotify(`Exported ${filtered.length} student records as PDF`);
              } finally {
                setExportingPdf(false);
              }
            }}
            className="btn-glass-glow inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-medium text-[var(--foreground)] disabled:opacity-40 whitespace-nowrap"
          >
            <Download className="size-3.5" />
            <span>{exportingPdf ? "Generating PDF..." : "Export PDF"}</span>
          </MagneticButton>
          <MagneticButton
            type="button"
            onClick={() => {
              playSound("nav");
              onNavigate("add");
            }}
            className="btn-futuristic inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold whitespace-nowrap"
          >
            <UserPlus className="size-3.5" />
            <span>Add student</span>
          </MagneticButton>
        </div>
      </div>

      {/* Filter Bar */}
      <SpotlightCard tilt={false} className="space-y-4 rounded-2xl p-4 sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter by student name, roll number, or email..."
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] py-2.5 pr-4 pl-10 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:border-[var(--accent)] focus:outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="inline-flex items-center gap-1 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-1">
              {(["all", "active", "inactive"] as const).map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => {
                    playSound("click");
                    setStatusFilter(status);
                  }}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition-colors whitespace-nowrap ${
                    statusFilter === status
                      ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                      : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>

            <select
              aria-label="Filter by year"
              value={String(yearFilter)}
              onChange={(e) => {
                playSound("click");
                setYearFilter(e.target.value === "ALL" ? "ALL" : Number(e.target.value));
              }}
              className="rounded-xl border border-[var(--border)] bg-[var(--popover)] px-3 py-2 text-xs font-medium text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none"
            >
              <option value="ALL">All Years</option>
              <option value="1">Year 1</option>
              <option value="2">Year 2</option>
              <option value="3">Year 3</option>
              <option value="4">Year 4</option>
            </select>

            <div className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--popover)] px-3 py-2">
              <SlidersHorizontal className="size-3.5 text-[var(--muted-foreground)]" />
              <select
                aria-label="Sort students"
                value={sortBy}
                onChange={(e) => {
                  playSound("click");
                  setSortBy(e.target.value as SortKey);
                }}
                className="bg-transparent text-xs font-medium text-[var(--foreground)] focus:outline-none"
              >
                <option value="newest">Recently Added</option>
                <option value="marks_desc">Highest Marks</option>
                <option value="marks_asc">Lowest Marks</option>
                <option value="name_asc">Name (A–Z)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Department Segmented Selector */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
          <button
            type="button"
            onClick={() => {
              speakBranch("ALL");
              onBranchFilterChange("ALL");
            }}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
              branchFilter === "ALL"
                ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                : "text-[var(--muted-foreground)] hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)]"
            }`}
          >
            All Departments
          </button>
          {BRANCHES.map((branch) => (
            <button
              key={branch}
              type="button"
              onClick={() => {
                speakBranch(branch);
                onBranchFilterChange(branch);
              }}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                branchFilter === branch
                  ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                  : "text-[var(--muted-foreground)] hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)]"
              }`}
            >
              {branch}
            </button>
          ))}
        </div>
      </SpotlightCard>

      {/* Directory Table */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No matching students"
          text="Try adjusting your department, year, or search filters to view student records."
          action={
            <button
              type="button"
              onClick={() => {
                playSound("click");
                setQuery("");
                setStatusFilter("all");
                setYearFilter("ALL");
                onBranchFilterChange("ALL");
              }}
              className="btn-glass-glow rounded-xl px-4 py-2 text-xs font-medium text-[var(--foreground)]"
            >
              Reset filters
            </button>
          }
        />
      ) : (
        <SpotlightCard tilt={false} className="overflow-x-auto rounded-2xl">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] text-left text-xs text-[var(--muted-foreground)]">
                <th className="px-5 py-3.5 font-semibold">Student</th>
                <th className="px-5 py-3.5 font-semibold">Department</th>
                <th className="hidden px-5 py-3.5 font-semibold md:table-cell">Contact</th>
                <th className="px-5 py-3.5 text-right font-semibold">Marks</th>
                <th className="px-5 py-3.5 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
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
                  <td className="hidden px-5 py-3.5 text-xs text-[var(--muted-foreground)] md:table-cell">
                    {s.email || "—"}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <div className="inline-flex items-center justify-end gap-2.5">
                      <span className="font-mono font-semibold tabular-nums text-[var(--foreground)]">
                        {s.marks}
                      </span>
                      <GradeBadge marks={s.marks} />
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <button
                      type="button"
                      onClick={async (e) => {
                        e.stopPropagation();
                        try {
                          const nextStatus = await toggleStudentStatus(s.roll);
                          playSound("toggle");
                          onNotify(`${s.name} set to ${nextStatus}`);
                        } catch {
                          playSound("delete");
                          onNotify("Failed to update student status");
                        }
                      }}
                      title="Toggle active status"
                      className="rounded-lg px-2 py-1 transition-colors hover:bg-[var(--surface-hover)]"
                    >
                      <StatusLabel status={s.status} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </SpotlightCard>
      )}
    </div>
  );
}
