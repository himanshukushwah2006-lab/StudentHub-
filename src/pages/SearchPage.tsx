import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { playSound } from "@/src/lib/sound";
import { getGrade, useStudents, type Student } from "@/src/lib/students";
import { EmptyState, GradeBadge, StatusLabel, StudentAvatar } from "@/src/components/StudentUI";
import { SpotlightCard } from "@/src/components/InteractiveSurface";

const GRADES = ["ALL", "A+", "A", "B", "C", "D", "F"] as const;

export function SearchPage({ onSelectStudent }: { onSelectStudent: (student: Student) => void }) {
  const students = useStudents();
  const [query, setQuery] = useState("");
  const [gradeFilter, setGradeFilter] = useState<(typeof GRADES)[number]>("ALL");
  const [minMarks, setMinMarks] = useState(0);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return students
      .filter((s) => {
        if (gradeFilter !== "ALL" && getGrade(s.marks) !== gradeFilter) return false;
        if (s.marks < minMarks) return false;
        if (!q) return true;
        return (
          s.name.toLowerCase().includes(q) ||
          s.roll.toLowerCase().includes(q) ||
          s.branch.toLowerCase().includes(q) ||
          s.email.toLowerCase().includes(q) ||
          `y${s.year}`.includes(q)
        );
      })
      .sort((a, b) => b.marks - a.marks);
  }, [students, query, gradeFilter, minMarks]);

  return (
    <div className="space-y-6 animate-rise">
      <div>
        <h1 className="font-display text-2xl font-bold text-[var(--foreground)] sm:text-3xl">
          Search Students
        </h1>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          Instant lookup across roll numbers, names, departments, emails, and score thresholds.
        </p>
      </div>

      <SpotlightCard tilt={false} className="space-y-4 rounded-2xl p-5 sm:p-6">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-[var(--muted-foreground)]" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, roll no (e.g. 0901CS), department, or email..."
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] py-3.5 pr-11 pl-12 text-base text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:border-[var(--accent)] focus:outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                playSound("soft");
                setQuery("");
              }}
              aria-label="Clear search"
              className="absolute top-1/2 right-3 grid size-7 -translate-y-1/2 place-items-center rounded-lg text-[var(--muted-foreground)] hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)]"
            >
              <X className="size-4" />
            </button>
          )}
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {GRADES.map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => {
                  playSound("click");
                  setGradeFilter(g);
                }}
                className={`rounded-lg px-3 py-1.5 font-mono text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  gradeFilter === g
                    ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                    : "text-[var(--muted-foreground)] hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)]"
                }`}
              >
                {g === "ALL" ? "All Grades" : g}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <label className="text-xs text-[var(--muted-foreground)] whitespace-nowrap">
              Min marks:{" "}
              <span className="font-mono font-semibold tabular-nums text-[var(--foreground)]">
                {minMarks}
              </span>
            </label>
            <input
              type="range"
              min={0}
              max={95}
              step={5}
              value={minMarks}
              onChange={(e) => setMinMarks(Number(e.target.value))}
              className="w-28 accent-sky-500"
            />
          </div>
        </div>
      </SpotlightCard>

      <div className="flex items-center justify-between text-xs text-[var(--muted-foreground)]">
        <span>
          Found{" "}
          <span className="font-mono font-semibold tabular-nums text-[var(--foreground)]">
            {results.length}
          </span>{" "}
          matching {results.length === 1 ? "student" : "students"}
        </span>
      </div>

      {results.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No matches found"
          text="Try broadening your search query or lowering the minimum marks threshold."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {results.map((s) => (
            <SpotlightCard
              key={s.roll}
              as="button"
              tilt
              maxTilt={5}
              onClick={() => {
                playSound("click");
                onSelectStudent(s);
              }}
              className="flex flex-col justify-between rounded-2xl p-5 text-left active:scale-[0.985]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <StudentAvatar name={s.name} photo={s.photo} />
                  <div className="min-w-0">
                    <p className="truncate font-display text-base font-semibold text-[var(--foreground)]">
                      {s.name}
                    </p>
                    <p className="font-mono text-xs tabular-nums text-[var(--muted-foreground)]">
                      {s.roll}
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-display text-xl font-bold tabular-nums text-[var(--foreground)]">
                    {s.marks}
                  </p>
                  <GradeBadge marks={s.marks} />
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-[var(--border)] pt-3 text-xs text-[var(--muted-foreground)]">
                <span>
                  {s.branch} · Year {s.year}
                </span>
                <StatusLabel status={s.status} />
              </div>
            </SpotlightCard>
          ))}
        </div>
      )}
    </div>
  );
}
