import { useEffect, useState } from "react";
import { getAuthHeaders } from "@/src/lib/auth";

export const BRANCHES = ["CSE", "IT", "AI & DS", "ECE", "EE", "ME", "CE", "IoT"] as const;
export type Branch = (typeof BRANCHES)[number];
export type StudentStatus = "active" | "inactive";

export interface Student {
  roll: string;
  name: string;
  branch: Branch;
  year: 1 | 2 | 3 | 4;
  marks: number;
  status: StudentStatus;
  email: string;
  phone: string;
  photo?: string;
  semesterGpas?: number[];
  createdAt: number;
}

export interface PublicStats {
  total: number;
  active: number;
  departments: number;
  average: number;
  passRate: number;
}

export const MAX_STUDENT_PHOTO_BYTES = 1024 * 1024; // 1 MB
const MAX_STORED_PHOTO_CHARS = 320_000;
const ROLL_PATTERN = /^[A-Z0-9_-]{3,32}$/;

export function validateStudentPhotoFile(
  file: File
): { ok: true } | { ok: false; error: string } {
  const mime = file.type.toLowerCase();
  const ext = file.name.toLowerCase().split(".").pop() ?? "";
  const isValidType =
    mime === "image/jpeg" ||
    mime === "image/png" ||
    (mime === "" && (ext === "jpg" || ext === "jpeg" || ext === "png"));

  if (!isValidType) {
    return { ok: false, error: "Only JPG or PNG images are allowed." };
  }
  if (file.size === 0) {
    return { ok: false, error: "Selected image file is empty." };
  }
  if (file.size >= MAX_STUDENT_PHOTO_BYTES) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
    return {
      ok: false,
      error: `Image must be less than 1 MB (selected file is ${sizeMb} MB).`,
    };
  }
  return { ok: true };
}

export function compressStudentPhoto(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read the selected image file."));
    reader.onload = () => {
      const raw = typeof reader.result === "string" ? reader.result : "";
      if (!raw) {
        reject(new Error("Could not decode the selected image."));
        return;
      }

      const img = new Image();
      img.onerror = () => reject(new Error("Invalid or corrupted image file."));
      img.onload = () => {
        const maxDim = 320;
        let width = img.naturalWidth || img.width || maxDim;
        let height = img.naturalHeight || img.height || maxDim;

        if (width > maxDim || height > maxDim) {
          const scale = Math.min(maxDim / width, maxDim / height);
          width = Math.max(1, Math.round(width * scale));
          height = Math.max(1, Math.round(height * scale));
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas image compression is unavailable in this browser."));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);

        const qualities = [0.85, 0.72, 0.58, 0.45];
        for (const q of qualities) {
          const out = canvas.toDataURL("image/jpeg", q);
          if (out.length <= MAX_STORED_PHOTO_CHARS) {
            resolve(out);
            return;
          }
        }
        reject(new Error("Image is too complex to compress. Please choose a smaller portrait."));
      };
      img.src = raw;
    };
    reader.readAsDataURL(file);
  });
}

export const RECENT_DAYS = 14;
const DAY_MS = 24 * 60 * 60 * 1000;

let studentsState: Student[] = [];
let studentsLoadingState = false;
const listeners = new Set<() => void>();

function emitChange() {
  listeners.forEach((cb) => cb());
}

function setStudentsStore(next: Student[], loading?: boolean) {
  studentsState = [...next].sort((a, b) => b.createdAt - a.createdAt);
  if (typeof loading === "boolean") {
    studentsLoadingState = loading;
  }
  emitChange();
}

async function parseError(res: Response, fallback: string): Promise<string> {
  try {
    const data = (await res.json()) as { error?: unknown };
    if (typeof data.error === "string" && data.error) return data.error;
  } catch {
    // ignore
  }
  return fallback;
}

export async function refreshStudentsFromServer(): Promise<void> {
  studentsLoadingState = true;
  emitChange();
  try {
    const res = await fetch("/api/students", {
      method: "GET",
      credentials: "same-origin",
      headers: getAuthHeaders(false),
    });
    if (!res.ok) {
      setStudentsStore([], false);
      return;
    }
    const data = (await res.json()) as { students?: Student[] };
    setStudentsStore(Array.isArray(data.students) ? data.students : [], false);
  } catch {
    studentsLoadingState = false;
    emitChange();
  }
}

export function useStudentsSync(isAdmin: boolean, adminId: string | null) {
  useEffect(() => {
    if (!isAdmin || !adminId) {
      setStudentsStore([], false);
      return;
    }
    void refreshStudentsFromServer();
    return () => {
      setStudentsStore([], false);
    };
  }, [isAdmin, adminId]);
}

export function useStudents(): Student[] {
  const [students, setStudents] = useState<Student[]>(studentsState);

  useEffect(() => {
    const handle = () => setStudents(studentsState);
    listeners.add(handle);
    handle();
    return () => {
      listeners.delete(handle);
    };
  }, []);

  return students;
}

export function useStudentsLoading(): boolean {
  const [loading, setLoading] = useState<boolean>(studentsLoadingState);

  useEffect(() => {
    const handle = () => setLoading(studentsLoadingState);
    listeners.add(handle);
    handle();
    return () => {
      listeners.delete(handle);
    };
  }, []);

  return loading;
}

export function usePublicStats(): PublicStats | null {
  const [stats, setStats] = useState<PublicStats | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/public/stats", { method: "GET", credentials: "same-origin" })
      .then(async (res) => {
        if (!res.ok || !active) return;
        const data = (await res.json()) as PublicStats;
        if (active) setStats(data);
      })
      .catch(() => {
        // Non-critical public metric
      });
    return () => {
      active = false;
    };
  }, []);

  return stats;
}

export async function addStudent(
  student: Omit<Student, "createdAt">
): Promise<{ ok: true } | { ok: false; error: string }> {
  const cleanRoll = student.roll.trim().toUpperCase();
  if (!cleanRoll) return { ok: false, error: "Roll number is required." };
  if (!ROLL_PATTERN.test(cleanRoll)) {
    return {
      ok: false,
      error: "Roll number must be 3–32 characters using only letters, numbers, '-' or '_'.",
    };
  }

  const res = await fetch("/api/students", {
    method: "POST",
    credentials: "same-origin",
    headers: getAuthHeaders(true),
    body: JSON.stringify({
      ...student,
      roll: cleanRoll,
      name: student.name.trim(),
      email: student.email.trim(),
      phone: student.phone.trim(),
      marks: Math.min(100, Math.max(0, Math.round(student.marks))),
    }),
  });

  if (!res.ok) {
    return { ok: false, error: await parseError(res, "Failed to save student record.") };
  }

  const data = (await res.json()) as { student: Student };
  setStudentsStore([data.student, ...studentsState.filter((s) => s.roll !== data.student.roll)]);
  return { ok: true };
}

export async function updateStudent(
  roll: string,
  patch: Partial<Omit<Student, "roll" | "createdAt">>
): Promise<void> {
  const res = await fetch(`/api/students/${encodeURIComponent(roll)}`, {
    method: "PATCH",
    credentials: "same-origin",
    headers: getAuthHeaders(true),
    body: JSON.stringify(patch),
  });
  if (!res.ok) {
    throw new Error(await parseError(res, "Failed to update student record."));
  }
  const data = (await res.json()) as { student: Student };
  setStudentsStore(studentsState.map((s) => (s.roll === roll ? data.student : s)));
}

export async function updateStudentPhoto(
  roll: string,
  photo?: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const url = `/api/students/${encodeURIComponent(roll)}/photo`;
  const res = photo
    ? await fetch(url, {
        method: "PUT",
        credentials: "same-origin",
        headers: getAuthHeaders(true),
        body: JSON.stringify({ photo }),
      })
    : await fetch(url, {
        method: "DELETE",
        credentials: "same-origin",
        headers: getAuthHeaders(false),
      });

  if (!res.ok) {
    return { ok: false, error: await parseError(res, "Could not update student photo.") };
  }
  const data = (await res.json()) as { student: Student };
  setStudentsStore(studentsState.map((s) => (s.roll === roll ? data.student : s)));
  return { ok: true };
}

export async function toggleStudentStatus(roll: string): Promise<StudentStatus> {
  const res = await fetch(`/api/students/${encodeURIComponent(roll)}/toggle-status`, {
    method: "POST",
    credentials: "same-origin",
    headers: getAuthHeaders(false),
  });
  if (!res.ok) {
    throw new Error(await parseError(res, "Failed to update student status."));
  }
  const data = (await res.json()) as { student: Student };
  setStudentsStore(studentsState.map((s) => (s.roll === roll ? data.student : s)));
  return data.student.status;
}

export async function deleteStudent(roll: string): Promise<void> {
  const res = await fetch(`/api/students/${encodeURIComponent(roll)}`, {
    method: "DELETE",
    credentials: "same-origin",
    headers: getAuthHeaders(false),
  });
  if (!res.ok) {
    throw new Error(await parseError(res, "Failed to remove student record."));
  }
  setStudentsStore(studentsState.filter((s) => s.roll !== roll));
}

export async function resetDemoStudents(): Promise<void> {
  const res = await fetch("/api/students/reset-demo", {
    method: "POST",
    credentials: "same-origin",
    headers: getAuthHeaders(false),
  });
  if (!res.ok) {
    throw new Error(await parseError(res, "Failed to restore demo student dataset."));
  }
  const data = (await res.json()) as { students: Student[] };
  setStudentsStore(data.students);
}

export async function clearAllStudents(): Promise<void> {
  const res = await fetch("/api/students", {
    method: "DELETE",
    credentials: "same-origin",
    headers: getAuthHeaders(false),
  });
  if (!res.ok) {
    throw new Error(await parseError(res, "Failed to clear student records."));
  }
  setStudentsStore([]);
}

export function generateRollNumber(branch: Branch, year: number): string {
  const codeMap: Record<Branch, string> = {
    CSE: "CS",
    IT: "IT",
    "AI & DS": "AD",
    ECE: "EC",
    EE: "EE",
    ME: "ME",
    CE: "CE",
    IoT: "IO",
  };
  const batchYear = String(26 - year).padStart(2, "0");
  const suffix = String(Math.floor(1001 + Math.random() * 899)).slice(0, 4);
  return `0901${codeMap[branch]}${batchYear}${suffix}`;
}

export function getGrade(marks: number): "A+" | "A" | "B" | "C" | "D" | "F" {
  if (marks >= 90) return "A+";
  if (marks >= 80) return "A";
  if (marks >= 70) return "B";
  if (marks >= 60) return "C";
  if (marks >= 40) return "D";
  return "F";
}

export interface SemesterGpaPoint {
  semester: string;
  gpa: number;
}

export function getStudentGpaHistory(student: Student): {
  points: SemesterGpaPoint[];
  currentGpa: number;
  cgpa: number;
  delta: number;
  peak: number;
} {
  const clampGpa = (val: number) => Math.min(10, Math.max(3.5, Math.round(val * 100) / 100));
  const currentGpa = clampGpa(student.marks / 10);

  let rawValues: number[];

  if (Array.isArray(student.semesterGpas) && student.semesterGpas.length >= 2) {
    rawValues = student.semesterGpas.map(clampGpa);
    rawValues[rawValues.length - 1] = currentGpa;
  } else {
    const count = Math.max(2, student.year * 2);
    let seed = 0;
    for (let i = 0; i < student.roll.length; i++) {
      seed = (seed * 37 + student.roll.charCodeAt(i)) % 10007;
    }

    const nextRand = () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return (seed % 1000) / 1000;
    };

    const startOffset = (nextRand() - 0.58) * 1.15;
    const startGpa = clampGpa(currentGpa + startOffset);
    rawValues = [];

    for (let i = 0; i < count; i++) {
      if (i === count - 1) {
        rawValues.push(currentGpa);
      } else {
        const progress = i / (count - 1);
        const baseline = startGpa + (currentGpa - startGpa) * progress;
        const wave = (nextRand() - 0.5) * 0.62;
        rawValues.push(clampGpa(baseline + wave));
      }
    }
  }

  const points = rawValues.map((gpa, idx) => ({
    semester: `Sem ${idx + 1}`,
    gpa,
  }));

  const sum = rawValues.reduce((acc, v) => acc + v, 0);
  const cgpa = Math.round((sum / rawValues.length) * 100) / 100;
  const prevGpa = rawValues.length >= 2 ? rawValues[rawValues.length - 2] : currentGpa;
  const delta = Math.round((currentGpa - prevGpa) * 100) / 100;
  const peak = Math.max(...rawValues);

  return { points, currentGpa, cgpa, delta, peak };
}

export function computeStats(students: Student[]) {
  const total = students.length;
  const active = students.filter((s) => s.status === "active").length;
  const cutoff = Date.now() - RECENT_DAYS * DAY_MS;
  const recent = students.filter((s) => s.createdAt >= cutoff).length;

  const byBranch = BRANCHES.map((branch) => ({
    branch,
    count: students.filter((s) => s.branch === branch).length,
  }));
  const departments = byBranch.filter((b) => b.count > 0).length;

  const average =
    total > 0 ? Math.round((students.reduce((acc, s) => acc + s.marks, 0) / total) * 10) / 10 : 0;
  const passed = students.filter((s) => s.marks >= 40).length;
  const passRate = total > 0 ? Math.round((passed / total) * 100) : 0;

  const gradeOrder: ("A+" | "A" | "B" | "C" | "D" | "F")[] = ["A+", "A", "B", "C", "D", "F"];
  const grades = gradeOrder.map((grade) => ({
    grade,
    count: students.filter((s) => getGrade(s.marks) === grade).length,
  }));

  return {
    total,
    active,
    departments,
    recent,
    average,
    passRate,
    byBranch,
    grades,
  };
}

function csvEscape(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function exportStudentsCsv(students: Student[], label?: string) {
  const headers = ["Roll No", "Name", "Department", "Year", "Marks", "Grade", "Status", "Email", "Phone"];
  const rows = students.map((s) => [
    csvEscape(s.roll),
    csvEscape(s.name),
    csvEscape(s.branch),
    `Y${s.year}`,
    String(s.marks),
    getGrade(s.marks),
    s.status,
    csvEscape(s.email),
    csvEscape(s.phone),
  ]);
  const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const slug = label
    ? `-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`
    : "";
  const a = document.createElement("a");
  a.href = url;
  a.download = `mits-studenthub${slug}-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportDepartmentCsv(students: Student[], branch: Branch | "ALL"): number {
  const subset = branch === "ALL" ? students : students.filter((s) => s.branch === branch);
  if (subset.length === 0) return 0;
  exportStudentsCsv(subset, branch === "ALL" ? "all-departments" : branch);
  return subset.length;
}
