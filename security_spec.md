# MITS StudentHub — Firestore Security Specification (Phase 0 TDD)

## 1. Data Invariants
1. **Default Deny**: Every unmatched path is denied for all reads and writes.
2. **Verified Admin Only for Student PII & Mutations**: Reading, listing, creating, updating, or deleting `/students/{rollId}` strictly requires an authenticated user with `email_verified == true` who is either the bootstrapped admin (`himanshukushwah2006@gmail.com`) or has a trusted record in `/admins/{uid}`.
3. **No Duplicate Roll Numbers**: Every student document ID `{rollId}` MUST equal `request.resource.data.roll` and match `^[A-Z0-9_\-]{3,32}$`. Creation is separated from update so a `create` never silently overwrites an existing roll number.
4. **Strict Schema & Bounds**: Every string field enforces `.size()` limits; `marks` is bounded `0..100`; `year` is bounded `1..4`; `branch` and `status` are strictly allowlisted; `semesterGpas` (if present) is bounded to `<= 8` numbers; `photo` (if present) must start with `data:image/jpeg;base64,` or `data:image/png;base64,` and be `<= 250000` chars.
5. **Immutable Audit Fields & Server Timestamps**: `roll`, `createdBy`, and `createdAt` are immutable after creation. `createdAt == request.time` on create; `updatedAt == request.time` on both create and update.
6. **Zero Self-Escalation**: Non-admins can NEVER create, update, or delete any document in `/admins/{adminId}`. An authenticated user can only `get` their own `/admins/{uid}` document to verify admin status.
7. **PII Isolation**: `/public_stats/overview` stores ONLY aggregate counts (`total`, `active`, `departments`, `average`, `passRate`, `updatedAt`) with zero PII.

## 2. The "Dirty Dozen" Attack Payloads (All Must Yield PERMISSION_DENIED)
1. **Unauthenticated Student Read**: `GET /students/0901CS231014` with `auth = null`.
2. **Unauthenticated Student List**: `LIST /students` with `auth = null`.
3. **Normal Visitor Student Create**: `CREATE /students/0901CS259999` by verified non-admin user (`visitor@example.com`).
4. **Email Spoofing Attack**: `GET /students/0901CS231014` with `email = "himanshukushwah2006@gmail.com"` and `email_verified = false`.
5. **Self-Escalation to Admin**: `CREATE /admins/{uid}` by non-admin user trying to insert `{ uid, role: "admin", ... }`.
6. **Shadow / Ghost Field Injection**: Admin `CREATE /students/0901CS259998` with extra key `isSuperAdmin: true`.
7. **ID / Roll Mismatch Poisoning**: Admin `CREATE /students/0901CS259998` with `data.roll = "0901CS000001"`.
8. **Oversized Document ID Poisoning**: Admin `CREATE /students/<200-char-id>` violating `isValidRollId`.
9. **Value Poisoning on Update**: Admin `UPDATE /students/0901CS231014` setting `marks: 999` or `marks: "100"`.
10. **Immutable Field Tampering**: Admin `UPDATE /students/0901CS231014` attempting to alter `createdBy`, `createdAt`, or `roll`.
11. **Client-Forged Timestamp**: Admin `CREATE /students/0901CS259997` with client-supplied `createdAt` != `request.time`.
12. **Unbounded Photo / Array Exhaustion**: Admin `UPDATE /students/0901CS231014` with `photo` > 250,000 chars or `semesterGpas` array of 50 elements.
