import { useEffect, useId, useMemo, useRef, useState, type ChangeEvent, type ReactNode } from "react";
import {
  AlertCircle,
  Camera,
  Check,
  CheckCircle2,
  Copy,
  Download,
  Loader2,
  Mail,
  Minus,
  PauseCircle,
  Pencil,
  Phone,
  QrCode,
  Save,
  Trash2,
  TrendingDown,
  TrendingUp,
  Upload,
  X,
  type LucideIcon,
} from "lucide-react";
import QRCode from "qrcode";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  BRANCHES,
  compressStudentPhoto,
  deleteStudent,
  getGrade,
  getStudentGpaHistory,
  toggleStudentStatus,
  updateStudent,
  updateStudentPhoto,
  validateStudentPhotoFile,
  type Branch,
  type Student,
  type StudentStatus,
} from "@/src/lib/students";
import { playSound, speakBranch } from "@/src/lib/sound";

const AVATAR_TONES = [
  "bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/25",
  "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/25",
  "bg-teal-500/15 text-teal-700 dark:text-teal-300 border-teal-500/25",
  "bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/25",
  "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/25",
];

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "ST";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function hashName(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) {
    h = (h * 31 + name.charCodeAt(i)) % 997;
  }
  return Math.abs(h);
}

export function StudentAvatar({
  name,
  photo,
  size = "md",
}: {
  name: string;
  photo?: string;
  size?: "sm" | "md" | "lg" | "xl";
}) {
  const tone = AVATAR_TONES[hashName(name) % AVATAR_TONES.length];
  const dims =
    size === "xl"
      ? "size-16 text-lg"
      : size === "lg"
      ? "size-12 text-base"
      : size === "sm"
      ? "size-8 text-xs"
      : "size-9 text-xs";

  const hasValidPhoto =
    typeof photo === "string" &&
    (photo.startsWith("data:image/jpeg;base64,") || photo.startsWith("data:image/png;base64,"));

  if (hasValidPhoto) {
    return (
      <div
        className={`relative shrink-0 overflow-hidden rounded-xl border border-cyan-400/35 bg-slate-900/40 shadow-xs ${dims}`}
      >
        <img
          src={photo}
          alt={`${name} profile photo`}
          referrerPolicy="no-referrer"
          className="h-full w-full object-cover object-center"
        />
      </div>
    );
  }

  return (
    <div
      className={`grid shrink-0 place-items-center rounded-xl border font-display font-semibold tracking-tight ${dims} ${tone}`}
      aria-hidden="true"
    >
      {getInitials(name)}
    </div>
  );
}

export function GradeBadge({ marks }: { marks: number }) {
  const grade = getGrade(marks);
  const tone =
    grade === "A+"
      ? "text-sky-600 dark:text-sky-400"
      : grade === "A"
      ? "text-teal-600 dark:text-teal-400"
      : grade === "B"
      ? "text-indigo-600 dark:text-indigo-400"
      : grade === "C"
      ? "text-amber-600 dark:text-amber-400"
      : grade === "D"
      ? "text-orange-600 dark:text-orange-400"
      : "text-red-600 dark:text-red-400";

  return (
    <span className={`font-mono text-xs font-semibold tabular-nums ${tone}`}>
      {grade}
    </span>
  );
}

export function StatusLabel({ status }: { status: StudentStatus }) {
  if (status === "active") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
        <CheckCircle2 className="size-3.5 shrink-0" />
        Active
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap">
      <PauseCircle className="size-3.5 shrink-0" />
      Inactive
    </span>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  text,
  action,
}: {
  icon: LucideIcon;
  title: string;
  text: string;
  action?: ReactNode;
}) {
  return (
    <div className="glass-panel flex flex-col items-center justify-center rounded-2xl px-6 py-12 text-center">
      <div className="grid size-12 place-items-center rounded-xl border border-[var(--border)] bg-[var(--surface-hover)] text-[var(--muted-foreground)]">
        <Icon className="size-5" />
      </div>
      <h3 className="mt-4 font-display text-lg font-semibold text-[var(--foreground)]">{title}</h3>
      <p className="mt-1.5 max-w-sm text-sm text-[var(--muted-foreground)]">{text}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

function GpaSparklineCard({ student }: { student: Student }) {
  const gradientId = useId();
  const history = useMemo(() => getStudentGpaHistory(student), [student]);

  const minGpa = Math.max(0, Math.floor((Math.min(...history.points.map((p) => p.gpa)) - 0.6) * 2) / 2);
  const maxGpa = Math.min(10, Math.ceil((Math.max(...history.points.map((p) => p.gpa)) + 0.4) * 2) / 2);

  const isUp = history.delta > 0.01;
  const isDown = history.delta < -0.01;
  const strokeColor = isDown ? "#f59e0b" : "var(--chart-1)";

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-hover)] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-[var(--muted-foreground)]">GPA Progression</p>
          <p className="mt-0.5 text-[11px] text-[var(--muted-foreground)]">
            {history.points[0]?.semester} – {history.points[history.points.length - 1]?.semester} · 10-pt scale
          </p>
        </div>
        <div className="text-right">
          <div className="flex items-baseline justify-end gap-1.5">
            <span className="font-display text-2xl font-bold tabular-nums text-[var(--foreground)]">
              {history.cgpa.toFixed(2)}
            </span>
            <span className="text-[11px] text-[var(--muted-foreground)]">CGPA</span>
          </div>
          <div
            className={`mt-0.5 inline-flex items-center gap-1 font-mono text-[11px] font-semibold tabular-nums ${
              isUp
                ? "text-emerald-600 dark:text-emerald-400"
                : isDown
                ? "text-amber-600 dark:text-amber-400"
                : "text-[var(--muted-foreground)]"
            }`}
          >
            {isUp ? (
              <TrendingUp className="size-3" />
            ) : isDown ? (
              <TrendingDown className="size-3" />
            ) : (
              <Minus className="size-3" />
            )}
            <span>
              {history.delta > 0 ? "+" : ""}
              {history.delta.toFixed(2)} vs prev
            </span>
          </div>
        </div>
      </div>

      <div className="mt-3 h-24 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={history.points} margin={{ top: 6, right: 6, left: 6, bottom: 0 }}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={strokeColor} stopOpacity={0.38} />
                <stop offset="100%" stopColor={strokeColor} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="semester"
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
              fontSize={10}
              stroke="var(--muted-foreground)"
              dy={4}
            />
            <YAxis domain={[minGpa, maxGpa]} hide />
            <Tooltip
              cursor={{ stroke: "var(--border-strong)", strokeDasharray: "3 3" }}
              contentStyle={{
                borderRadius: 10,
                border: "1px solid var(--border-strong)",
                background: "var(--popover)",
                color: "var(--foreground)",
                fontSize: 11,
                padding: "6px 10px",
                boxShadow: "0 10px 24px -10px rgba(0,0,0,0.45)",
              }}
              formatter={(value) => [`${Number(value).toFixed(2)} / 10`, "SGPA"]}
            />
            <Area
              type="monotone"
              dataKey="gpa"
              stroke={strokeColor}
              strokeWidth={2.25}
              fill={`url(#${gradientId})`}
              dot={{ r: 2.5, fill: strokeColor, strokeWidth: 0 }}
              activeDot={{ r: 4.5, fill: strokeColor, stroke: "var(--popover)", strokeWidth: 2 }}
              animationDuration={500}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-2.5 flex items-center justify-between border-t border-[var(--border)] pt-2.5 text-[11px]">
        <span className="text-[var(--muted-foreground)]">
          Start:{" "}
          <span className="font-mono font-semibold tabular-nums text-[var(--foreground)]">
            {history.points[0]?.gpa.toFixed(2)}
          </span>
        </span>
        <span className="text-[var(--muted-foreground)]">
          Peak:{" "}
          <span className="font-mono font-semibold tabular-nums text-[var(--accent)]">
            {history.peak.toFixed(2)}
          </span>
        </span>
        <span className="text-[var(--muted-foreground)]">
          Latest:{" "}
          <span className="font-mono font-semibold tabular-nums text-[var(--foreground)]">
            {history.currentGpa.toFixed(2)}
          </span>
        </span>
      </div>
    </div>
  );
}

function buildStudentQrPayload(student: Student): string {
  const { cgpa } = getStudentGpaHistory(student);
  const lines = [
    "MITS StudentHub Digital ID",
    `Name: ${student.name}`,
    `Roll No: ${student.roll}`,
    `Department: ${student.branch} (Year ${student.year})`,
    `Marks: ${student.marks}/100 (Grade ${getGrade(student.marks)})`,
    `CGPA: ${cgpa.toFixed(2)}/10`,
    `Status: ${student.status === "active" ? "Active" : "Inactive"}`,
  ];
  if (student.email) lines.push(`Email: ${student.email}`);
  if (student.phone) lines.push(`Phone: ${student.phone}`);
  return lines.join("\n");
}

function StudentQrCard({
  student,
  onNotify,
}: {
  student: Student;
  onNotify: (message: string) => void;
}) {
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [copied, setCopied] = useState(false);

  const payload = useMemo(() => buildStudentQrPayload(student), [student]);

  useEffect(() => {
    let active = true;
    QRCode.toDataURL(payload, {
      width: 320,
      margin: 2,
      errorCorrectionLevel: "M",
      color: {
        dark: "#0b1224",
        light: "#ffffff",
      },
    })
      .then((url) => {
        if (active) setQrDataUrl(url);
      })
      .catch(() => {
        if (active) setQrDataUrl("");
      });
    return () => {
      active = false;
    };
  }, [payload]);

  const handleDownloadQr = () => {
    if (!qrDataUrl) return;
    playSound("success");
    const link = document.createElement("a");
    link.href = qrDataUrl;
    link.download = `MITS-QR-${student.roll}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    onNotify(`Downloaded QR pass for ${student.name}`);
  };

  const handleCopyPayload = async () => {
    try {
      await navigator.clipboard.writeText(payload);
      playSound("click");
      setCopied(true);
      onNotify(`Copied QR profile details for ${student.roll}`);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      playSound("soft");
      onNotify("Could not copy to clipboard");
    }
  };

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-hover)] p-4">
      <div className="flex items-center gap-4">
        <div className="grid size-24 shrink-0 place-items-center overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 shadow-xs">
          {qrDataUrl ? (
            <img
              src={qrDataUrl}
              alt={`QR code for ${student.name} (${student.roll})`}
              className="h-full w-full object-contain"
            />
          ) : (
            <QrCode className="size-8 animate-pulse text-slate-400" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--foreground)]">
            <QrCode className="size-3.5 shrink-0 text-[var(--accent)]" />
            <span className="truncate">Student QR Pass</span>
          </div>
          <p className="mt-1 text-[11px] leading-relaxed text-[var(--muted-foreground)]">
            Scan with any camera to view verified MITS ID, roll no, marks, CGPA &amp; contact info.
          </p>
          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadQr}
              disabled={!qrDataUrl}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 text-[11px] font-medium text-[var(--foreground)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)] disabled:opacity-50 whitespace-nowrap"
            >
              <Download className="size-3" />
              <span>Download QR</span>
            </button>
            <button
              type="button"
              onClick={handleCopyPayload}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 text-[11px] font-medium text-[var(--foreground)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)] whitespace-nowrap"
            >
              {copied ? <Check className="size-3 text-emerald-500" /> : <Copy className="size-3" />}
              <span>{copied ? "Copied" : "Copy Info"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function StudentDetailDrawer({
  student,
  onClose,
  onNotify,
}: {
  student: Student | null;
  onClose: () => void;
  onNotify: (message: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [name, setName] = useState("");
  const [branch, setBranch] = useState<Branch>("CSE");
  const [year, setYear] = useState<1 | 2 | 3 | 4>(1);
  const [marks, setMarks] = useState(80);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  useEffect(() => {
    setEditing(false);
    setConfirmDelete(false);
    setPhotoError(null);
    setBusy(false);
  }, [student?.roll]);

  if (!student) return null;

  const triggerPhotoPicker = () => {
    if (busy) return;
    playSound("click");
    setPhotoError(null);
    fileInputRef.current?.click();
  };

  const handlePhotoChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    const check = validateStudentPhotoFile(file);
    if (!check.ok) {
      playSound("soft");
      setPhotoError(check.error);
      return;
    }

    setBusy(true);
    setPhotoError(null);
    try {
      const compressed = await compressStudentPhoto(file);
      const saved = await updateStudentPhoto(student.roll, compressed);
      if (!saved.ok) {
        playSound("soft");
        setPhotoError(saved.error);
        return;
      }
      playSound("success");
      onNotify(`Updated profile photo for ${student.name}`);
    } catch (err) {
      playSound("soft");
      setPhotoError(err instanceof Error ? err.message : "Could not save profile photo.");
    } finally {
      setBusy(false);
    }
  };

  const handleRemovePhoto = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const saved = await updateStudentPhoto(student.roll, undefined);
      if (!saved.ok) {
        setPhotoError(saved.error);
        return;
      }
      setPhotoError(null);
      playSound("delete");
      onNotify(`Removed profile photo for ${student.name}`);
    } catch (err) {
      setPhotoError(err instanceof Error ? err.message : "Could not remove photo.");
    } finally {
      setBusy(false);
    }
  };

  const startEdit = () => {
    playSound("click");
    setName(student.name);
    setBranch(student.branch);
    setYear(student.year);
    setMarks(student.marks);
    setEmail(student.email);
    setPhone(student.phone);
    setConfirmDelete(false);
    setEditing(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || busy) return;
    setBusy(true);
    try {
      await updateStudent(student.roll, {
        name: name.trim(),
        branch,
        year,
        marks,
        email: email.trim(),
        phone: phone.trim(),
      });
      playSound("success");
      setEditing(false);
      onNotify(`Updated ${name.trim()} in database`);
    } catch (err) {
      playSound("delete");
      onNotify(err instanceof Error ? err.message : "Failed to update student");
    } finally {
      setBusy(false);
    }
  };

  const handleToggleStatus = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const nextStatus = await toggleStudentStatus(student.roll);
      playSound("toggle");
      onNotify(`${student.name} marked as ${nextStatus}`);
    } catch {
      playSound("delete");
      onNotify("Failed to update enrollment status");
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await deleteStudent(student.roll);
      playSound("delete");
      setConfirmDelete(false);
      setEditing(false);
      onNotify(`Removed ${student.name} from database`);
      onClose();
    } catch {
      playSound("delete");
      onNotify("Failed to remove student record");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-slate-950/55 backdrop-blur-xs"
      onClick={() => {
        playSound("soft");
        setEditing(false);
        setConfirmDelete(false);
        setPhotoError(null);
        onClose();
      }}
    >
      <aside
        role="dialog"
        aria-label="Student profile"
        className="glass-panel-strong flex h-full w-full max-w-md flex-col justify-between overflow-y-auto border-l border-[var(--border)] p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".jpg,.jpeg,.png,image/jpeg,image/png"
            onChange={handlePhotoChange}
            className="hidden"
          />

          <div className="flex items-start justify-between gap-4 border-b border-[var(--border)] pb-5">
            <div className="flex items-center gap-3.5 min-w-0">
              <button
                type="button"
                onClick={triggerPhotoPicker}
                title={student.photo ? "Change student photo (JPG/PNG < 1 MB)" : "Add student photo (JPG/PNG < 1 MB)"}
                aria-label={student.photo ? "Change student photo" : "Add student photo"}
                className="group relative shrink-0 rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
              >
                <StudentAvatar name={student.name} photo={student.photo} size="xl" />
                <span className="absolute inset-0 grid place-items-center rounded-xl bg-slate-950/60 text-white opacity-0 transition-opacity group-hover:opacity-100">
                  <Camera className="size-4" />
                </span>
                <span className="absolute -right-1 -bottom-1 grid size-6 place-items-center rounded-full border border-[var(--border-strong)] bg-[var(--popover)] text-[var(--accent)] shadow-sm">
                  <Camera className="size-3" />
                </span>
              </button>
              <div className="min-w-0">
                <h2 className="truncate font-display text-xl font-semibold text-[var(--foreground)]">
                  {student.name}
                </h2>
                <p className="mt-0.5 font-mono text-xs text-[var(--muted-foreground)] tabular-nums">
                  {student.roll}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={triggerPhotoPicker}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface-hover)] px-2.5 py-1 text-[11px] font-medium text-[var(--foreground)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)] whitespace-nowrap"
                  >
                    <Upload className="size-3" />
                    <span>{student.photo ? "Change Photo" : "Add Photo"}</span>
                  </button>
                  {student.photo && (
                    <button
                      type="button"
                      onClick={handleRemovePhoto}
                      className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium text-red-600 transition-colors hover:bg-red-500/10 dark:text-red-400 whitespace-nowrap"
                    >
                      <Trash2 className="size-3" />
                      <span>Remove</span>
                    </button>
                  )}
                </div>
                <p className="mt-1 text-[10px] text-[var(--muted-foreground)]">
                  JPG or PNG · Max size under 1 MB
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                playSound("soft");
                setEditing(false);
                setConfirmDelete(false);
                setPhotoError(null);
                onClose();
              }}
              aria-label="Close panel"
              className="grid size-9 shrink-0 place-items-center rounded-lg border border-[var(--border)] text-[var(--muted-foreground)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)]"
            >
              <X className="size-4" />
            </button>
          </div>

          {photoError && (
            <div
              role="alert"
              className="mt-3 flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-xs font-medium text-red-700 dark:text-red-300"
            >
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              <span>{photoError}</span>
            </div>
          )}

          {!editing ? (
            <div className="mt-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-hover)] p-4">
                  <p className="text-xs text-[var(--muted-foreground)]">Academic Score</p>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="font-display text-3xl font-bold tabular-nums text-[var(--foreground)]">
                      {student.marks}
                    </span>
                    <span className="text-xs text-[var(--muted-foreground)]">/ 100</span>
                    <span className="ml-auto">
                      <GradeBadge marks={student.marks} />
                    </span>
                  </div>
                  <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-[var(--border)]">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-sky-500 to-indigo-500 transition-all duration-300"
                      style={{ width: `${student.marks}%` }}
                    />
                  </div>
                </div>

                <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-hover)] p-4">
                  <p className="text-xs text-[var(--muted-foreground)]">Enrollment</p>
                  <p className="mt-2 font-display text-lg font-semibold text-[var(--foreground)]">
                    {student.branch} · Year {student.year}
                  </p>
                  <div className="mt-2.5">
                    <StatusLabel status={student.status} />
                  </div>
                </div>
              </div>

              <GpaSparklineCard student={student} />

              <div className="space-y-3 border-t border-[var(--border)] pt-5 text-sm">
                <div className="flex items-center justify-between gap-4">
                  <span className="flex items-center gap-2 text-[var(--muted-foreground)]">
                    <Mail className="size-4 shrink-0" /> Email
                  </span>
                  <span className="truncate font-medium text-[var(--foreground)]">
                    {student.email || "Not provided"}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="flex items-center gap-2 text-[var(--muted-foreground)]">
                    <Phone className="size-4 shrink-0" /> Phone
                  </span>
                  <span className="font-mono text-xs text-[var(--foreground)] tabular-nums">
                    {student.phone || "Not provided"}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-[var(--muted-foreground)]">Record Added</span>
                  <span className="text-xs text-[var(--foreground)] tabular-nums">
                    {new Date(student.createdAt).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </div>
              </div>

              <StudentQrCard student={student} onNotify={onNotify} />
            </div>
          ) : (
            <form onSubmit={handleSave} className="mt-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-[var(--muted-foreground)]">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2.5 text-sm text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[var(--muted-foreground)]">
                    Department
                  </label>
                  <select
                    value={branch}
                    onChange={(e) => {
                      const next = e.target.value as Branch;
                      speakBranch(next);
                      setBranch(next);
                    }}
                    className="mt-1.5 w-full rounded-xl border border-[var(--border)] bg-[var(--popover)] px-3 py-2.5 text-sm text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none"
                  >
                    {BRANCHES.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--muted-foreground)]">
                    Academic Year
                  </label>
                  <select
                    value={year}
                    onChange={(e) => setYear(Number(e.target.value) as 1 | 2 | 3 | 4)}
                    className="mt-1.5 w-full rounded-xl border border-[var(--border)] bg-[var(--popover)] px-3 py-2.5 text-sm text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none"
                  >
                    {[1, 2, 3, 4].map((y) => (
                      <option key={y} value={y}>
                        Year {y}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-[var(--muted-foreground)]">
                    Marks (0–100)
                  </label>
                  <span className="font-mono text-xs font-semibold tabular-nums text-[var(--accent)]">
                    {marks} · Grade {getGrade(marks)}
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={marks}
                  onChange={(e) => setMarks(Number(e.target.value))}
                  className="mt-2 w-full accent-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--muted-foreground)]">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2.5 text-sm text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--muted-foreground)]">
                  Phone Number
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2.5 text-sm text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2.5 pt-2">
                <button
                  type="submit"
                  disabled={busy}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-sky-500 disabled:opacity-60 whitespace-nowrap"
                >
                  {busy ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}{" "}
                  {busy ? "Saving..." : "Save Changes"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    playSound("soft");
                    setEditing(false);
                  }}
                  className="rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--surface-hover)] whitespace-nowrap"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>

        {!editing && (
          <div className="mt-8 space-y-2.5 border-t border-[var(--border)] pt-5">
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={startEdit}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--surface-hover)] whitespace-nowrap"
              >
                <Pencil className="size-4" /> Edit Record
              </button>
              <button
                type="button"
                onClick={handleToggleStatus}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--surface-hover)] whitespace-nowrap"
              >
                {student.status === "active" ? "Set Inactive" : "Set Active"}
              </button>
            </div>

            {!confirmDelete ? (
              <button
                type="button"
                onClick={() => {
                  playSound("click");
                  setConfirmDelete(true);
                }}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-red-500/25 px-4 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-500/10 dark:text-red-400 whitespace-nowrap"
              >
                <Trash2 className="size-4" /> Remove Student
              </button>
            ) : (
              <div className="flex items-center justify-between gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3">
                <span className="text-xs font-medium text-red-700 dark:text-red-300">
                  Confirm permanent removal?
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      playSound("soft");
                      setConfirmDelete(false);
                    }}
                    className="rounded-lg px-2.5 py-1 text-xs font-medium text-[var(--foreground)] hover:bg-[var(--surface-hover)]"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleDelete}
                    className="rounded-lg bg-red-600 px-3 py-1 text-xs font-medium text-white hover:bg-red-500"
                  >
                    Delete
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </aside>
    </div>
  );
}
