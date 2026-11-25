import { useState } from "react";
import { Loader2, RefreshCw, UserPlus } from "lucide-react";
import { playSound, speakBranch } from "@/src/lib/sound";
import {
  addStudent,
  BRANCHES,
  generateRollNumber,
  getGrade,
  type Branch,
  type StudentStatus,
} from "@/src/lib/students";
import { MagneticButton, SpotlightCard } from "@/src/components/InteractiveSurface";
import type { RouteId } from "@/src/components/AppShell";

export function AddStudentPage({
  onNavigate,
  onNotify,
}: {
  onNavigate: (route: RouteId) => void;
  onNotify: (msg: string) => void;
}) {
  const [name, setName] = useState("");
  const [branch, setBranch] = useState<Branch>("CSE");
  const [year, setYear] = useState<1 | 2 | 3 | 4>(2);
  const [roll, setRoll] = useState(() => generateRollNumber("CSE", 2));
  const [marks, setMarks] = useState(84);
  const [status, setStatus] = useState<StudentStatus>("active");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleRegenerateRoll = () => {
    playSound("click");
    setRoll(generateRollNumber(branch, year));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    if (!name.trim()) {
      setError("Please enter the student's full name.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const res = await addStudent({
        roll,
        name,
        branch,
        year,
        marks,
        status,
        email:
          email.trim() ||
          `${name
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, ".")}@mitsgwalior.in`,
        phone: phone.trim() || "+91 98260 00000",
      });

      if (!res.ok) {
        playSound("delete");
        setError(res.error);
        return;
      }

      playSound("success");
      onNotify(`Saved ${name.trim()} (${roll.trim().toUpperCase()}) to database`);
      onNavigate("dashboard");
    } catch (err) {
      playSound("delete");
      setError(err instanceof Error ? err.message : "Failed to save student record.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6 animate-rise">
      <div>
        <h1 className="font-display text-2xl font-bold text-white drop-shadow-sm sm:text-3xl">
          Add New Student
        </h1>
        <p className="mt-1 text-sm text-slate-200/90 drop-shadow-sm">
          Register a student record into MITS StudentHub. Analytics update immediately.
        </p>
      </div>

      <SpotlightCard
        tilt={false}
        className="rounded-2xl border border-cyan-300/25 !bg-slate-950/68 shadow-[0_24px_64px_-24px_rgba(0,0,0,0.9)] backdrop-blur-xl"
      >
        <form onSubmit={handleSubmit} className="space-y-5 p-6 sm:p-7">
        {error && (
          <div className="rounded-xl border border-red-500/40 bg-red-500/15 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate-300">
              Full Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError(null);
              }}
              placeholder="e.g. Priya Sharma"
              className="mt-1.5 w-full rounded-xl border border-white/15 bg-slate-900/75 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-400 focus:border-cyan-400 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300">
              Department
            </label>
            <select
              value={branch}
              onChange={(e) => {
                const next = e.target.value as Branch;
                speakBranch(next);
                setBranch(next);
                setRoll(generateRollNumber(next, year));
              }}
              className="mt-1.5 w-full rounded-xl border border-white/15 bg-slate-900/90 px-3.5 py-2.5 text-sm text-white focus:border-cyan-400 focus:outline-none"
            >
              {BRANCHES.map((b) => (
                <option key={b} value={b} className="bg-slate-900 text-white">
                  {b}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300">
              Academic Year
            </label>
            <select
              value={year}
              onChange={(e) => {
                playSound("click");
                const next = Number(e.target.value) as 1 | 2 | 3 | 4;
                setYear(next);
                setRoll(generateRollNumber(branch, next));
              }}
              className="mt-1.5 w-full rounded-xl border border-white/15 bg-slate-900/90 px-3.5 py-2.5 text-sm text-white focus:border-cyan-400 focus:outline-none"
            >
              <option value={1} className="bg-slate-900 text-white">Year 1</option>
              <option value={2} className="bg-slate-900 text-white">Year 2</option>
              <option value={3} className="bg-slate-900 text-white">Year 3</option>
              <option value={4} className="bg-slate-900 text-white">Year 4</option>
            </select>
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate-300">
              Roll Number
            </label>
            <div className="mt-1.5 flex gap-2">
              <input
                type="text"
                required
                value={roll}
                onChange={(e) => {
                  setRoll(e.target.value.toUpperCase());
                  setError(null);
                }}
                className="flex-1 rounded-xl border border-white/15 bg-slate-900/75 px-3.5 py-2.5 font-mono text-sm text-white focus:border-cyan-400 focus:outline-none"
              />
              <button
                type="button"
                onClick={handleRegenerateRoll}
                className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-slate-900/80 px-3.5 py-2.5 text-xs font-medium text-slate-100 transition-colors hover:border-cyan-400/50 hover:bg-slate-800/80 whitespace-nowrap"
              >
                <RefreshCw className="size-3.5" />
                <span>Generate</span>
              </button>
            </div>
          </div>

          <div className="sm:col-span-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-slate-300">
                Academic Marks (0–100)
              </label>
              <span className="font-mono text-xs font-semibold tabular-nums text-cyan-300">
                {marks} / 100 · Grade {getGrade(marks)}
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={marks}
              onChange={(e) => setMarks(Number(e.target.value))}
              className="mt-2.5 w-full accent-sky-400"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300">
              Email Address (Optional)
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@mitsgwalior.in"
              className="mt-1.5 w-full rounded-xl border border-white/15 bg-slate-900/75 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-400 focus:border-cyan-400 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300">
              Phone Number (Optional)
            </label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91 98261 00000"
              className="mt-1.5 w-full rounded-xl border border-white/15 bg-slate-900/75 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-400 focus:border-cyan-400 focus:outline-none"
            />
          </div>

          <div className="sm:col-span-2">
            <span className="block text-xs font-medium text-slate-300">
              Enrollment Status
            </span>
            <div className="mt-2 inline-flex gap-1 rounded-xl border border-white/15 bg-slate-900/75 p-1">
              {(["active", "inactive"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    playSound("toggle");
                    setStatus(s);
                  }}
                  className={`rounded-lg px-4 py-1.5 text-xs font-medium capitalize transition-colors ${
                    status === s
                      ? "bg-cyan-500/20 text-cyan-300"
                      : "text-slate-300 hover:text-white"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-3 border-t border-white/15 pt-5">
          <button
            type="button"
            onClick={() => {
              playSound("soft");
              onNavigate("dashboard");
            }}
            className="rounded-xl border border-white/20 bg-slate-900/70 px-4 py-2.5 text-sm font-medium text-slate-100 transition-colors hover:border-cyan-300/50 hover:bg-slate-800/80 whitespace-nowrap"
          >
            Cancel
          </button>
          <MagneticButton
            type="submit"
            disabled={saving}
            className="btn-futuristic inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold whitespace-nowrap disabled:opacity-60"
          >
            {saving ? <Loader2 className="size-4 animate-spin" /> : <UserPlus className="size-4" />}
            <span>{saving ? "Saving..." : "Save Student"}</span>
          </MagneticButton>
        </div>
        </form>
      </SpotlightCard>
    </div>
  );
}
