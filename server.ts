import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import express, { type NextFunction, type Request, type Response } from "express";
import { createServer as createViteServer } from "vite";

const PORT = Number(process.env.PORT) || 3000;
const IS_PROD = process.env.NODE_ENV === "production";
const DATA_DIR = path.resolve(process.cwd(), "data");
const STORE_PATH = path.resolve(DATA_DIR, "studenthub-store.json");

const SESSION_COOKIE_NAME = "mits_admin_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days
const SESSION_SECRET =
  process.env.SESSION_SECRET && process.env.SESSION_SECRET.trim().length >= 16
    ? process.env.SESSION_SECRET.trim()
    : crypto.randomBytes(32).toString("hex");

const BRANCHES = ["CSE", "IT", "AI & DS", "ECE", "EE", "ME", "CE", "IoT"] as const;
type Branch = (typeof BRANCHES)[number];
type StudentStatus = "active" | "inactive";

interface StudentRecord {
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
  updatedAt: number;
}

interface StoredAdmin {
  id: string;
  username: string;
  displayName: string;
  salt: string;
  passwordHash: string;
  tokenVersion: number;
  createdAt: number;
  updatedAt: number;
}

interface StoreSchema {
  initializedStudents: boolean;
  admins: StoredAdmin[];
  students: StudentRecord[];
}

interface AuthenticatedAdmin {
  id: string;
  username: string;
  displayName: string;
  isEnvAdmin: boolean;
  jti: string;
}

type AuthedRequest = Request & { admin?: AuthenticatedAdmin };

const USERNAME_PATTERN = /^[a-zA-Z0-9._-]{3,32}$/;
const ROLL_PATTERN = /^[A-Z0-9_-]{3,32}$/;
const DAY_MS = 24 * 60 * 60 * 1000;

// In-memory revoked session IDs (clears cleanly on restart; password/username change also bumps tokenVersion)
const revokedJtis = new Set<string>();
// Simple brute-force protection per client IP
const failedLogins = new Map<string, { count: number; resetAt: number }>();

function daysAgo(days: number): number {
  return Date.now() - days * DAY_MS;
}

function createInitialStudents(): StudentRecord[] {
  const now = Date.now();
  const raw: Omit<StudentRecord, "updatedAt">[] = [
    { roll: "0901CS231014", name: "Aarav Sharma", branch: "CSE", year: 3, marks: 95, status: "active", email: "aarav.sharma@mitsgwalior.in", phone: "+91 98261 44012", createdAt: daysAgo(1) },
    { roll: "0901AD231008", name: "Ananya Verma", branch: "AI & DS", year: 3, marks: 93, status: "active", email: "ananya.verma@mitsgwalior.in", phone: "+91 98261 77291", createdAt: daysAgo(2) },
    { roll: "0901CS241031", name: "Himanshu Kushwah", branch: "CSE", year: 2, marks: 91, status: "active", email: "himanshu.k@mitsgwalior.in", phone: "+91 98930 51208", createdAt: daysAgo(3) },
    { roll: "0901IT221019", name: "Diya Chauhan", branch: "IT", year: 4, marks: 89, status: "active", email: "diya.chauhan@mitsgwalior.in", phone: "+91 94251 88320", createdAt: daysAgo(4) },
    { roll: "0901EC231045", name: "Rohan Bhadoria", branch: "ECE", year: 3, marks: 84, status: "active", email: "rohan.b@mitsgwalior.in", phone: "+91 97520 66104", createdAt: daysAgo(5) },
    { roll: "0901IO241012", name: "Kavya Tiwari", branch: "IoT", year: 2, marks: 87, status: "active", email: "kavya.tiwari@mitsgwalior.in", phone: "+91 98264 11905", createdAt: daysAgo(6) },
    { roll: "0901CS221062", name: "Siddharth Jain", branch: "CSE", year: 4, marks: 92, status: "active", email: "siddharth.jain@mitsgwalior.in", phone: "+91 99812 30941", createdAt: daysAgo(9) },
    { roll: "0901ME231027", name: "Pranav Tomar", branch: "ME", year: 3, marks: 74, status: "active", email: "pranav.tomar@mitsgwalior.in", phone: "+91 98260 55412", createdAt: daysAgo(11) },
    { roll: "0901EE241009", name: "Meera Joshi", branch: "EE", year: 2, marks: 79, status: "active", email: "meera.joshi@mitsgwalior.in", phone: "+91 96301 24890", createdAt: daysAgo(12) },
    { roll: "0901AD241022", name: "Kabir Malhotra", branch: "AI & DS", year: 2, marks: 86, status: "active", email: "kabir.m@mitsgwalior.in", phone: "+91 91112 73819", createdAt: daysAgo(16) },
    { roll: "0901IT231054", name: "Ishita Gupta", branch: "IT", year: 3, marks: 82, status: "active", email: "ishita.gupta@mitsgwalior.in", phone: "+91 98267 90432", createdAt: daysAgo(19) },
    { roll: "0901CE221015", name: "Devansh Rathore", branch: "CE", year: 4, marks: 68, status: "active", email: "devansh.r@mitsgwalior.in", phone: "+91 94253 41877", createdAt: daysAgo(22) },
    { roll: "0901EC241038", name: "Sneha Kulkarni", branch: "ECE", year: 2, marks: 77, status: "active", email: "sneha.k@mitsgwalior.in", phone: "+91 97541 22980", createdAt: daysAgo(25) },
    { roll: "0901CS251003", name: "Vihaan Agrawal", branch: "CSE", year: 1, marks: 88, status: "active", email: "vihaan.agrawal@mitsgwalior.in", phone: "+91 98934 77611", createdAt: daysAgo(28) },
    { roll: "0901ME241041", name: "Arjun Yadav", branch: "ME", year: 2, marks: 56, status: "inactive", email: "arjun.yadav@mitsgwalior.in", phone: "+91 99265 10394", createdAt: daysAgo(32) },
    { roll: "0901EE221033", name: "Nandini Dubey", branch: "EE", year: 4, marks: 81, status: "active", email: "nandini.d@mitsgwalior.in", phone: "+91 94257 60128", createdAt: daysAgo(36) },
    { roll: "0901IT251018", name: "Yashwant Sengar", branch: "IT", year: 1, marks: 72, status: "active", email: "yashwant.s@mitsgwalior.in", phone: "+91 98262 39015", createdAt: daysAgo(40) },
    { roll: "0901CE231029", name: "Riya Shrivastava", branch: "CE", year: 3, marks: 63, status: "active", email: "riya.s@mitsgwalior.in", phone: "+91 97528 84110", createdAt: daysAgo(44) },
    { roll: "0901EC221011", name: "Aditya Mishra", branch: "ECE", year: 4, marks: 36, status: "inactive", email: "aditya.mishra@mitsgwalior.in", phone: "+91 96304 51092", createdAt: daysAgo(50) },
    { roll: "0901AD251007", name: "Tanvi Saxena", branch: "AI & DS", year: 1, marks: 90, status: "active", email: "tanvi.saxena@mitsgwalior.in", phone: "+91 98269 44820", createdAt: daysAgo(53) },
    { roll: "0901CS231079", name: "Kartikeya Patel", branch: "CSE", year: 3, marks: 65, status: "active", email: "kartikeya.p@mitsgwalior.in", phone: "+91 91118 22039", createdAt: daysAgo(58) },
    { roll: "0901IO231016", name: "Sanya Bansal", branch: "IoT", year: 3, marks: 78, status: "active", email: "sanya.bansal@mitsgwalior.in", phone: "+91 98932 61477", createdAt: daysAgo(62) },
  ];
  return raw.map((s) => ({ ...s, updatedAt: now }));
}

function loadStore(): StoreSchema {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true, mode: 0o700 });
    }
    if (fs.existsSync(STORE_PATH)) {
      const parsed = JSON.parse(fs.readFileSync(STORE_PATH, "utf8")) as Partial<StoreSchema>;
      const students = Array.isArray(parsed.students) ? parsed.students : createInitialStudents();
      const admins = Array.isArray(parsed.admins) ? parsed.admins : [];
      return {
        initializedStudents: Boolean(parsed.initializedStudents ?? true),
        admins,
        students,
      };
    }
  } catch (err) {
    console.error("Failed reading store file, creating fresh store:", err);
  }

  const initial: StoreSchema = {
    initializedStudents: true,
    admins: [],
    students: createInitialStudents(),
  };
  saveStore(initial);
  return initial;
}

function saveStore(data: StoreSchema): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true, mode: 0o700 });
  }
  const tmpPath = path.resolve(DATA_DIR, `studenthub-store.${crypto.randomUUID()}.tmp`);
  if (!tmpPath.startsWith(DATA_DIR + path.sep) || !STORE_PATH.startsWith(DATA_DIR + path.sep)) {
    throw new Error("Invalid store path");
  }
  fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), { encoding: "utf8", mode: 0o600 });
  fs.renameSync(tmpPath, STORE_PATH);
}

const store: StoreSchema = loadStore();

// --- Password Hashing (scrypt + constant-time verify) ---
function hashPassword(password: string, salt?: string): { salt: string; hash: string } {
  const actualSalt = salt ?? crypto.randomBytes(16).toString("hex");
  const derived = crypto.scryptSync(password, actualSalt, 64, { N: 16384, r: 8, p: 1 });
  return { salt: actualSalt, hash: derived.toString("hex") };
}

function verifyPassword(password: string, salt: string, expectedHashHex: string): boolean {
  try {
    const derived = crypto.scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1 });
    const expected = Buffer.from(expectedHashHex, "hex");
    if (derived.length !== expected.length) return false;
    return crypto.timingSafeEqual(derived, expected);
  } catch {
    return false;
  }
}

function timingSafeStringEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  const maxLen = Math.max(bufA.length, bufB.length, 1);
  const paddedA = Buffer.alloc(maxLen);
  const paddedB = Buffer.alloc(maxLen);
  bufA.copy(paddedA);
  bufB.copy(paddedB);
  return crypto.timingSafeEqual(paddedA, paddedB) && bufA.length === bufB.length;
}

function getEnvAdminCredentials(): { username: string; password: string } | null {
  const password = (process.env.ADMIN_PASSWORD ?? "").trim();
  if (!password) return null;
  const username = (process.env.ADMIN_USERNAME ?? "admin").trim() || "admin";
  return { username, password };
}

function isSetupRequired(): boolean {
  return !getEnvAdminCredentials() && store.admins.length === 0;
}

// --- Signed Session Tokens (HMAC-SHA256) ---
interface SessionPayload {
  sub: string;
  usr: string;
  ver: number;
  env: boolean;
  jti: string;
  exp: number;
}

function signSessionToken(payload: SessionPayload): string {
  const encoded = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const sig = crypto.createHmac("sha256", SESSION_SECRET).update(encoded).digest("base64url");
  return `${encoded}.${sig}`;
}

function verifySessionToken(token: string): AuthenticatedAdmin | null {
  if (!token || typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [encoded, sig] = parts;
  if (!encoded || !sig) return null;

  const expectedSig = crypto
    .createHmac("sha256", SESSION_SECRET)
    .update(encoded)
    .digest("base64url");

  if (!timingSafeStringEqual(sig, expectedSig)) return null;

  let payload: SessionPayload;
  try {
    payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as SessionPayload;
  } catch {
    return null;
  }

  if (!payload || typeof payload.exp !== "number" || Date.now() > payload.exp) return null;
  if (!payload.jti || revokedJtis.has(payload.jti)) return null;

  if (payload.env) {
    const envAdmin = getEnvAdminCredentials();
    if (!envAdmin || envAdmin.username.toLowerCase() !== String(payload.usr).toLowerCase()) {
      return null;
    }
    return {
      id: "env-admin",
      username: envAdmin.username,
      displayName: envAdmin.username,
      isEnvAdmin: true,
      jti: payload.jti,
    };
  }

  const found = store.admins.find((a) => a.id === payload.sub);
  if (!found || found.tokenVersion !== payload.ver) return null;

  return {
    id: found.id,
    username: found.username,
    displayName: found.displayName,
    isEnvAdmin: false,
    jti: payload.jti,
  };
}

function parseCookies(req: Request): Record<string, string> {
  const header = req.headers.cookie;
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(";")) {
    const idx = part.indexOf("=");
    if (idx <= 0) continue;
    const k = part.slice(0, idx).trim();
    const v = part.slice(idx + 1).trim();
    out[k] = decodeURIComponent(v);
  }
  return out;
}

function extractToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
    return authHeader.slice(7).trim();
  }
  const cookies = parseCookies(req);
  if (cookies[SESSION_COOKIE_NAME]) {
    return cookies[SESSION_COOKIE_NAME];
  }
  return null;
}

function setSessionCookie(req: Request, res: Response, token: string): void {
  const isHttps =
    req.secure ||
    req.headers["x-forwarded-proto"] === "https" ||
    process.env.NODE_ENV === "production";
  const parts = [
    `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}`,
    "Path=/",
    "HttpOnly",
    `Max-Age=${Math.floor(SESSION_TTL_MS / 1000)}`,
  ];
  if (isHttps) {
    parts.push("Secure", "SameSite=None", "Partitioned");
  } else {
    parts.push("SameSite=Lax");
  }
  res.setHeader("Set-Cookie", parts.join("; "));
}

function clearSessionCookie(req: Request, res: Response): void {
  const isHttps =
    req.secure ||
    req.headers["x-forwarded-proto"] === "https" ||
    process.env.NODE_ENV === "production";
  const parts = [
    `${SESSION_COOKIE_NAME}=`,
    "Path=/",
    "HttpOnly",
    "Max-Age=0",
  ];
  if (isHttps) {
    parts.push("Secure", "SameSite=None", "Partitioned");
  } else {
    parts.push("SameSite=Lax");
  }
  res.setHeader("Set-Cookie", parts.join("; "));
}

function requireCsrfHeader(req: Request, res: Response, next: NextFunction): void {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    next();
    return;
  }
  const customHeader = req.headers["x-requested-with"];
  if (customHeader !== "MITS-StudentHub") {
    res.status(403).json({ error: "Missing required security header." });
    return;
  }
  next();
}

function requireAdmin(req: AuthedRequest, res: Response, next: NextFunction): void {
  const token = extractToken(req);
  const admin = token ? verifySessionToken(token) : null;
  if (!admin) {
    res.status(401).json({ error: "Administrator authentication is required." });
    return;
  }
  req.admin = admin;
  next();
}

function isValidBranch(val: unknown): val is Branch {
  return typeof val === "string" && (BRANCHES as readonly string[]).includes(val);
}

function computePublicStats(students: StudentRecord[]) {
  const total = students.length;
  const active = students.filter((s) => s.status === "active").length;
  const departments = BRANCHES.filter((b) => students.some((s) => s.branch === b)).length;
  const average =
    total > 0 ? Math.round((students.reduce((acc, s) => acc + s.marks, 0) / total) * 10) / 10 : 0;
  const passed = students.filter((s) => s.marks >= 40).length;
  const passRate = total > 0 ? Math.round((passed / total) * 100) : 0;
  return { total, active, departments, average, passRate };
}

function checkLoginThrottle(ip: string): { allowed: true } | { allowed: false; retrySeconds: number } {
  const now = Date.now();
  const entry = failedLogins.get(ip);
  if (!entry || now > entry.resetAt) {
    return { allowed: true };
  }
  if (entry.count >= 12) {
    return { allowed: false, retrySeconds: Math.ceil((entry.resetAt - now) / 1000) };
  }
  return { allowed: true };
}

function recordFailedLogin(ip: string): void {
  const now = Date.now();
  const entry = failedLogins.get(ip);
  if (!entry || now > entry.resetAt) {
    failedLogins.set(ip, { count: 1, resetAt: now + 5 * 60 * 1000 });
  } else {
    entry.count += 1;
  }
}

function clearFailedLogin(ip: string): void {
  failedLogins.delete(ip);
}

async function startServer() {
  const app = express();
  app.set("trust proxy", 1);
  app.disable("x-powered-by");
  app.use(express.json({ limit: "2mb" }));

  // Basic security headers (no X-Frame-Options so AI Studio iframe preview works cleanly)
  app.use((_req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "no-referrer");
    next();
  });

  // Require custom CSRF header on all mutating /api routes
  app.use("/api", requireCsrfHeader);

  // --- Public Endpoints (Zero PII) ---
  app.get("/api/public/stats", (_req, res) => {
    res.json(computePublicStats(store.students));
  });

  app.get("/api/auth/me", (req: AuthedRequest, res) => {
    const token = extractToken(req);
    const admin = token ? verifySessionToken(token) : null;
    res.json({
      authenticated: Boolean(admin),
      needsSetup: isSetupRequired(),
      admin: admin
        ? {
            id: admin.id,
            username: admin.username,
            displayName: admin.displayName,
            isEnvAdmin: admin.isEnvAdmin,
          }
        : null,
    });
  });

  // One-time atomic first-run setup (locks permanently once claimed or when ADMIN_PASSWORD env is set)
  app.post("/api/auth/setup", (req, res) => {
    if (!isSetupRequired()) {
      res.status(409).json({
        error: "An administrator account is already configured. Please sign in with your username and password.",
      });
      return;
    }

    const rawUsername = typeof req.body?.username === "string" ? req.body.username.trim() : "";
    const rawPassword = typeof req.body?.password === "string" ? req.body.password : "";
    const rawDisplay =
      typeof req.body?.displayName === "string" && req.body.displayName.trim()
        ? req.body.displayName.trim().slice(0, 80)
        : rawUsername;

    if (!USERNAME_PATTERN.test(rawUsername)) {
      res.status(400).json({
        error: "Username must be 3–32 characters using only letters, numbers, '.', '_' or '-'.",
      });
      return;
    }
    if (rawPassword.length < 6 || rawPassword.length > 128) {
      res.status(400).json({ error: "Password must be between 6 and 128 characters." });
      return;
    }

    const { salt, hash } = hashPassword(rawPassword);
    const now = Date.now();
    const newAdmin: StoredAdmin = {
      id: crypto.randomUUID(),
      username: rawUsername,
      displayName: rawDisplay,
      salt,
      passwordHash: hash,
      tokenVersion: 1,
      createdAt: now,
      updatedAt: now,
    };

    store.admins.push(newAdmin);
    saveStore(store);

    const token = signSessionToken({
      sub: newAdmin.id,
      usr: newAdmin.username,
      ver: newAdmin.tokenVersion,
      env: false,
      jti: crypto.randomUUID(),
      exp: now + SESSION_TTL_MS,
    });
    setSessionCookie(req, res, token);

    res.status(201).json({
      token,
      admin: {
        id: newAdmin.id,
        username: newAdmin.username,
        displayName: newAdmin.displayName,
        isEnvAdmin: false,
      },
    });
  });

  // Username + Password Login (No email required)
  app.post("/api/auth/login", (req, res) => {
    const ip = req.ip || "unknown";
    const throttle = checkLoginThrottle(ip);
    if (!throttle.allowed) {
      res.status(429).json({
        error: `Too many failed login attempts. Try again in ${throttle.retrySeconds} seconds.`,
      });
      return;
    }

    if (isSetupRequired()) {
      res.status(400).json({
        error: "No administrator account exists yet. Create your admin username and password first.",
      });
      return;
    }

    const usernameInput = typeof req.body?.username === "string" ? req.body.username.trim() : "";
    const passwordInput = typeof req.body?.password === "string" ? req.body.password : "";

    if (!usernameInput || !passwordInput) {
      res.status(400).json({ error: "Username and password are required." });
      return;
    }

    // 1) Environment-configured admin override (if set in Secrets / .env)
    const envAdmin = getEnvAdminCredentials();
    if (
      envAdmin &&
      envAdmin.username.toLowerCase() === usernameInput.toLowerCase() &&
      timingSafeStringEqual(passwordInput, envAdmin.password)
    ) {
      clearFailedLogin(ip);
      const token = signSessionToken({
        sub: "env-admin",
        usr: envAdmin.username,
        ver: 1,
        env: true,
        jti: crypto.randomUUID(),
        exp: Date.now() + SESSION_TTL_MS,
      });
      setSessionCookie(req, res, token);
      res.json({
        token,
        admin: {
          id: "env-admin",
          username: envAdmin.username,
          displayName: envAdmin.username,
          isEnvAdmin: true,
        },
      });
      return;
    }

    // 2) Stored server-side admin accounts (salted scrypt verification)
    const matched = store.admins.find(
      (a) => a.username.toLowerCase() === usernameInput.toLowerCase()
    );
    if (!matched || !verifyPassword(passwordInput, matched.salt, matched.passwordHash)) {
      recordFailedLogin(ip);
      res.status(401).json({ error: "Invalid username or password. Please check your credentials." });
      return;
    }

    clearFailedLogin(ip);
    const token = signSessionToken({
      sub: matched.id,
      usr: matched.username,
      ver: matched.tokenVersion,
      env: false,
      jti: crypto.randomUUID(),
      exp: Date.now() + SESSION_TTL_MS,
    });
    setSessionCookie(req, res, token);

    res.json({
      token,
      admin: {
        id: matched.id,
        username: matched.username,
        displayName: matched.displayName,
        isEnvAdmin: false,
      },
    });
  });

  // Secure Logout (revokes token server-side & clears cookie)
  app.post("/api/auth/logout", (req, res) => {
    const token = extractToken(req);
    const admin = token ? verifySessionToken(token) : null;
    if (admin?.jti) {
      revokedJtis.add(admin.jti);
    }
    clearSessionCookie(req, res);
    res.json({ ok: true });
  });

  // Change own Username and/or Password (Admin only)
  app.patch("/api/auth/credentials", requireAdmin, (req: AuthedRequest, res) => {
    const current = req.admin!;
    if (current.isEnvAdmin) {
      res.status(400).json({
        error: "This session uses environment variables (ADMIN_USERNAME / ADMIN_PASSWORD). Create a stored admin account below or update your environment secrets.",
      });
      return;
    }

    const stored = store.admins.find((a) => a.id === current.id);
    if (!stored) {
      res.status(404).json({ error: "Admin account not found." });
      return;
    }

    const currentPassword =
      typeof req.body?.currentPassword === "string" ? req.body.currentPassword : "";
    const newUsername =
      typeof req.body?.newUsername === "string" ? req.body.newUsername.trim() : stored.username;
    const newPassword =
      typeof req.body?.newPassword === "string" ? req.body.newPassword : "";

    if (!currentPassword || !verifyPassword(currentPassword, stored.salt, stored.passwordHash)) {
      res.status(401).json({ error: "Current password is incorrect." });
      return;
    }

    if (!USERNAME_PATTERN.test(newUsername)) {
      res.status(400).json({
        error: "Username must be 3–32 characters using only letters, numbers, '.', '_' or '-'.",
      });
      return;
    }

    const duplicate = store.admins.find(
      (a) => a.id !== stored.id && a.username.toLowerCase() === newUsername.toLowerCase()
    );
    if (duplicate) {
      res.status(409).json({ error: `Username "${newUsername}" is already taken.` });
      return;
    }

    if (newPassword) {
      if (newPassword.length < 6 || newPassword.length > 128) {
        res.status(400).json({ error: "New password must be between 6 and 128 characters." });
        return;
      }
      const { salt, hash } = hashPassword(newPassword);
      stored.salt = salt;
      stored.passwordHash = hash;
    }

    stored.username = newUsername;
    stored.displayName = newUsername;
    stored.tokenVersion += 1;
    stored.updatedAt = Date.now();
    saveStore(store);

    // Revoke previous token and issue a fresh token for this admin
    revokedJtis.add(current.jti);
    const freshToken = signSessionToken({
      sub: stored.id,
      usr: stored.username,
      ver: stored.tokenVersion,
      env: false,
      jti: crypto.randomUUID(),
      exp: Date.now() + SESSION_TTL_MS,
    });
    setSessionCookie(req, res, freshToken);

    res.json({
      token: freshToken,
      admin: {
        id: stored.id,
        username: stored.username,
        displayName: stored.displayName,
        isEnvAdmin: false,
      },
    });
  });

  // List Admin Accounts (Admin only, never exposes hashes/salts)
  app.get("/api/auth/admins", requireAdmin, (_req, res) => {
    res.json({
      admins: store.admins.map((a) => ({
        id: a.id,
        username: a.username,
        displayName: a.displayName,
        createdAt: a.createdAt,
        updatedAt: a.updatedAt,
      })),
    });
  });

  // Create Additional Admin Account (Admin only)
  app.post("/api/auth/admins", requireAdmin, (req, res) => {
    const rawUsername = typeof req.body?.username === "string" ? req.body.username.trim() : "";
    const rawPassword = typeof req.body?.password === "string" ? req.body.password : "";

    if (!USERNAME_PATTERN.test(rawUsername)) {
      res.status(400).json({
        error: "Username must be 3–32 characters using only letters, numbers, '.', '_' or '-'.",
      });
      return;
    }
    if (rawPassword.length < 6 || rawPassword.length > 128) {
      res.status(400).json({ error: "Password must be between 6 and 128 characters." });
      return;
    }
    if (store.admins.some((a) => a.username.toLowerCase() === rawUsername.toLowerCase())) {
      res.status(409).json({ error: `Admin username "${rawUsername}" already exists.` });
      return;
    }

    const { salt, hash } = hashPassword(rawPassword);
    const now = Date.now();
    const created: StoredAdmin = {
      id: crypto.randomUUID(),
      username: rawUsername,
      displayName: rawUsername,
      salt,
      passwordHash: hash,
      tokenVersion: 1,
      createdAt: now,
      updatedAt: now,
    };
    store.admins.push(created);
    saveStore(store);

    res.status(201).json({
      admin: {
        id: created.id,
        username: created.username,
        displayName: created.displayName,
        createdAt: created.createdAt,
        updatedAt: created.updatedAt,
      },
    });
  });

  // Delete Another Admin Account (Admin only)
  app.delete("/api/auth/admins/:id", requireAdmin, (req: AuthedRequest, res) => {
    const targetId = String(req.params.id || "");
    if (targetId === req.admin?.id) {
      res.status(400).json({ error: "You cannot delete the currently signed-in admin account." });
      return;
    }
    const idx = store.admins.findIndex((a) => a.id === targetId);
    if (idx === -1) {
      res.status(404).json({ error: "Admin account not found." });
      return;
    }
    if (store.admins.length <= 1 && !getEnvAdminCredentials()) {
      res.status(400).json({ error: "At least one administrator account must remain." });
      return;
    }
    store.admins.splice(idx, 1);
    saveStore(store);
    res.json({ ok: true });
  });

  // --- Protected Student Records CRUD API (Server-Enforced Admin Only) ---
  app.get("/api/students", requireAdmin, (_req, res) => {
    const sorted = [...store.students].sort((a, b) => b.createdAt - a.createdAt);
    res.json({ students: sorted });
  });

  app.post("/api/students", requireAdmin, (req, res) => {
    const body = req.body ?? {};
    const cleanRoll = typeof body.roll === "string" ? body.roll.trim().toUpperCase() : "";
    const cleanName = typeof body.name === "string" ? body.name.trim().slice(0, 120) : "";
    const branch = body.branch;
    const rawYear = Number(body.year);
    const rawMarks = Number(body.marks);
    const status: StudentStatus = body.status === "inactive" ? "inactive" : "active";
    const cleanEmail = typeof body.email === "string" ? body.email.trim().slice(0, 254) : "";
    const cleanPhone = typeof body.phone === "string" ? body.phone.trim().slice(0, 32) : "";

    if (!ROLL_PATTERN.test(cleanRoll)) {
      res.status(400).json({
        error: "Roll number must be 3–32 characters using only letters, numbers, '-' or '_'.",
      });
      return;
    }
    if (!cleanName) {
      res.status(400).json({ error: "Student full name is required." });
      return;
    }
    if (!isValidBranch(branch)) {
      res.status(400).json({ error: "Invalid department selected." });
      return;
    }
    if (!Number.isInteger(rawYear) || rawYear < 1 || rawYear > 4) {
      res.status(400).json({ error: "Academic year must be between 1 and 4." });
      return;
    }
    if (!Number.isFinite(rawMarks) || rawMarks < 0 || rawMarks > 100) {
      res.status(400).json({ error: "Marks must be between 0 and 100." });
      return;
    }
    if (store.students.some((s) => s.roll.toUpperCase() === cleanRoll)) {
      res.status(409).json({ error: `Roll number ${cleanRoll} already exists in the database.` });
      return;
    }

    const now = Date.now();
    const record: StudentRecord = {
      roll: cleanRoll,
      name: cleanName,
      branch,
      year: rawYear as 1 | 2 | 3 | 4,
      marks: Math.round(rawMarks),
      status,
      email: cleanEmail,
      phone: cleanPhone,
      createdAt: now,
      updatedAt: now,
    };

    store.students.unshift(record);
    saveStore(store);
    res.status(201).json({ student: record });
  });

  app.patch("/api/students/:roll", requireAdmin, (req, res) => {
    const roll = decodeURIComponent(String(req.params.roll || "")).trim().toUpperCase();
    const target = store.students.find((s) => s.roll.toUpperCase() === roll);
    if (!target) {
      res.status(404).json({ error: "Student record not found." });
      return;
    }

    const body = req.body ?? {};
    if (typeof body.name === "string") {
      const trimmed = body.name.trim().slice(0, 120);
      if (!trimmed) {
        res.status(400).json({ error: "Student name cannot be empty." });
        return;
      }
      target.name = trimmed;
    }
    if (body.branch !== undefined) {
      if (!isValidBranch(body.branch)) {
        res.status(400).json({ error: "Invalid department." });
        return;
      }
      target.branch = body.branch;
    }
    if (body.year !== undefined) {
      const y = Number(body.year);
      if (!Number.isInteger(y) || y < 1 || y > 4) {
        res.status(400).json({ error: "Year must be 1–4." });
        return;
      }
      target.year = y as 1 | 2 | 3 | 4;
    }
    if (body.marks !== undefined) {
      const m = Number(body.marks);
      if (!Number.isFinite(m) || m < 0 || m > 100) {
        res.status(400).json({ error: "Marks must be 0–100." });
        return;
      }
      target.marks = Math.round(m);
    }
    if (body.status === "active" || body.status === "inactive") {
      target.status = body.status;
    }
    if (typeof body.email === "string") {
      target.email = body.email.trim().slice(0, 254);
    }
    if (typeof body.phone === "string") {
      target.phone = body.phone.trim().slice(0, 32);
    }
    target.updatedAt = Date.now();
    saveStore(store);
    res.json({ student: target });
  });

  app.put("/api/students/:roll/photo", requireAdmin, (req, res) => {
    const roll = decodeURIComponent(String(req.params.roll || "")).trim().toUpperCase();
    const target = store.students.find((s) => s.roll.toUpperCase() === roll);
    if (!target) {
      res.status(404).json({ error: "Student record not found." });
      return;
    }
    const photo = typeof req.body?.photo === "string" ? req.body.photo : "";
    const validPrefix =
      photo.startsWith("data:image/jpeg;base64,") || photo.startsWith("data:image/png;base64,");
    if (!validPrefix || photo.length < 30 || photo.length > 1_400_000) {
      res.status(400).json({ error: "Only JPG or PNG images under 1 MB are allowed." });
      return;
    }
    target.photo = photo;
    target.updatedAt = Date.now();
    saveStore(store);
    res.json({ student: target });
  });

  app.delete("/api/students/:roll/photo", requireAdmin, (req, res) => {
    const roll = decodeURIComponent(String(req.params.roll || "")).trim().toUpperCase();
    const target = store.students.find((s) => s.roll.toUpperCase() === roll);
    if (!target) {
      res.status(404).json({ error: "Student record not found." });
      return;
    }
    delete target.photo;
    target.updatedAt = Date.now();
    saveStore(store);
    res.json({ student: target });
  });

  app.post("/api/students/:roll/toggle-status", requireAdmin, (req, res) => {
    const roll = decodeURIComponent(String(req.params.roll || "")).trim().toUpperCase();
    const target = store.students.find((s) => s.roll.toUpperCase() === roll);
    if (!target) {
      res.status(404).json({ error: "Student record not found." });
      return;
    }
    target.status = target.status === "active" ? "inactive" : "active";
    target.updatedAt = Date.now();
    saveStore(store);
    res.json({ student: target });
  });

  app.delete("/api/students/:roll", requireAdmin, (req, res) => {
    const roll = decodeURIComponent(String(req.params.roll || "")).trim().toUpperCase();
    const idx = store.students.findIndex((s) => s.roll.toUpperCase() === roll);
    if (idx === -1) {
      res.status(404).json({ error: "Student record not found." });
      return;
    }
    store.students.splice(idx, 1);
    saveStore(store);
    res.json({ ok: true });
  });

  app.post("/api/students/reset-demo", requireAdmin, (_req, res) => {
    store.students = createInitialStudents();
    saveStore(store);
    res.json({ students: store.students });
  });

  app.delete("/api/students", requireAdmin, (_req, res) => {
    store.students = [];
    saveStore(store);
    res.json({ students: [] });
  });

  // --- Frontend Serving (Vite Dev Middleware or Built dist/) ---
  if (!IS_PROD) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), "dist");
    app.use(express.static(distDir));
    app.get("*", (_req, res) => {
      res.sendFile(path.resolve(distDir, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`MITS StudentHub server running on http://0.0.0.0:${PORT}`);
  });
}

void startServer();
