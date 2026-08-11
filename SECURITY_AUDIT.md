# Security Audit

**Project:** EZ-ACE  
**Date:** 2026-08-11  
**Reviewed revision:** `fb1a95e` plus the five uncommitted working-tree fixes present during review  
**Scope:** Broken Access Control / IDOR, SQL Injection, Cross-Site Scripting, Credential Stuffing / Brute Force, and File Upload Attack

## Executive summary

No Critical or High vulnerabilities were found. Authorization boundaries, parameterized database access, React output escaping, private Blob delivery, and authentication rate limiting are implemented consistently.

Three Medium risks remain:

1. Existing attempts remain usable after their exam or class is withdrawn.
2. Login protection is IP-based only and has no MFA or account-aware backoff.
3. PDF validation accepts any content beginning with `%PDF-`; it does not detect malicious or parser-hostile PDFs.

| Severity | Count |
| --- | ---: |
| Critical | 0 |
| High | 0 |
| Medium | 3 |
| Low | 3 |

## Method

- Reviewed all application TypeScript/TSX, database schema and migrations, server actions, route handlers, scripts, and security headers.
- Traced every user-controlled identifier from request input to authorization and database access.
- Searched for raw SQL, dynamic identifiers, DOM/HTML escape hatches, unsafe URL construction, credential handling, and upload processing.
- Inspected installed Better Auth and Vercel Blob behavior relevant to rate limits, cookies, callbacks, and private storage.
- Ran `npm audit --omit=dev`, ESLint, TypeScript checks, and tests.
- Compared controls with current OWASP, Better Auth, Next.js, and Vercel guidance.

This was source-assisted testing, not a full penetration test. It did not include destructive payloads, malware samples, a second-user deployed IDOR test, proxy/WAF validation, or infrastructure review outside this repository.

## Findings

### SEC-01 — Withdrawn exams remain accessible through existing attempts

**Severity:** Medium  
**Category:** Broken Access Control

Attempt creation correctly requires a published exam in an active class. After creation, however, the attempt API authorizes only by attempt ID, owner ID, and attempt status. It does not re-check that the exam remains published or its class remains active.

**Evidence**

- [`startAttempt`](src/lib/attempt-actions.ts#L18) checks `exams.status = published` and `classes.archivedAt IS NULL` only when creating an attempt.
- [`owned`](src/app/api/attempts/[id]/route.ts#L8) scopes lookup to attempt ID and current user.
- GET, PATCH, and POST then use that result without checking current exam/class lifecycle state.

**Impact**

An authenticated student who started an exam before it was unpublished, archived, or its class was archived can continue reading its questions, saving answers, and submitting it. This is not cross-user IDOR, but it bypasses the administrator's later withdrawal decision.

**Fix**

Create one shared lookup for active attempts that joins `exams` and `classes` and requires:

- `attempts.userId = session.user.id`
- `attempts.id = requested id`
- `attempts.status = in_progress`
- `exams.status = published`
- `classes.archivedAt IS NULL`

Use it for attempt GET, PATCH, and POST. Return `404` for failed authorization. If existing attempts are intentionally allowed to finish after withdrawal, document that policy and treat this finding as accepted behavior.

**Verification**

Start an attempt as Student A, unpublish its exam, then verify all three attempt operations return `404`. Repeat after archiving the class and verify Student B cannot access Student A's attempt ID.

### SEC-02 — Distributed credential stuffing is not account-throttled

**Severity:** Medium  
**Category:** Credential Stuffing / Brute Force

Better Auth rate limiting is enabled and stored in PostgreSQL. Sign-in is limited to five attempts per minute per detected IP, and signup to five attempts per fifteen minutes. This is a strong baseline, but a distributed attacker can rotate IP addresses because no account-aware backoff, MFA, passkey, breached-password check, or login alert exists.

The minimum password length is 10. OWASP currently treats passwords shorter than 15 characters as weak when MFA is not enabled.

**Evidence**

- [`emailAndPassword`](src/lib/auth.ts#L19) sets `minPasswordLength: 10`.
- [`rateLimit`](src/lib/auth.ts#L27) uses database storage with endpoint-specific IP limits.
- No MFA/passkey plugin, account-based failed-attempt counter, breached-password blocklist, or authentication alerting is configured.

**Impact**

Public login remains susceptible to password spraying and credential stuffing distributed across many IPs. Administrator compromise would expose all users, exams, results, password-reset controls, and upload capability.

**Fix priority**

1. Require a generated 15+ character admin password immediately.
2. Prefer MFA/passkey for the administrator before broad public deployment.
3. Add account-aware exponential delay or temporary lockout without revealing whether a username exists.
4. Log and alert on repeated failures and successful admin login from a new context.
5. Verify Better Auth resolves the intended client IP on Vercel; configure a trusted proxy/header only if Vercel guarantees that clients cannot spoof it.

Do not replace the existing database/IP limiter; layer account-aware protection on top of it.

### SEC-03 — PDF validation is structural only at the first five bytes

**Severity:** Medium  
**Category:** File Upload Attack

The upload flow has good authorization, size, MIME, extension, randomized-path, private-storage, and total-cap controls. Server-side content validation only confirms that the object begins with `%PDF-`. A polyglot or malicious PDF can pass this test.

**Evidence**

- [`onBeforeGenerateToken`](src/app/api/documents/upload/route.ts#L56) requires an administrator, active class, `.pdf` suffix, `application/pdf`, a 25 MB maximum, and a random suffix.
- [`verifyPdf`](src/app/api/documents/upload/route.ts#L23) reads only five bytes.
- [`finalize`](src/app/api/documents/upload/route.ts#L30) checks metadata, storage cap, and that five-byte signature before registration.
- [`GET /api/documents/[id]`](src/app/api/documents/[id]/route.ts#L8) serves private files through an authenticated handler with `application/pdf`, `nosniff`, and a sanitized filename.
- PDF.js parses the document in each student's browser to render the first page.

**Impact**

A malicious or parser-hostile PDF supplied to the administrator could exploit a browser/PDF.js vulnerability, consume excessive client resources, or contain unwanted active content. Upload is administrator-only, which lowers likelihood but does not make externally sourced documents trustworthy.

**Fix**

- For the current private MVP, accept PDFs only from trusted sources and keep PDF.js/browser dependencies updated.
- Before accepting untrusted PDFs, add a vetted malware scanner or PDF Content Disarm and Reconstruction pipeline. Do not treat additional magic bytes or `%%EOF` checks as sufficient security.
- Preserve the existing private store, random suffix, server-side delivery, size limits, and authorization checks.

### SEC-04 — Production CSP permits inline scripts

**Severity:** Low  
**Category:** Cross-Site Scripting defense in depth

No executable XSS sink was found. React renders untrusted class names, filenames, usernames, CSV errors, exam text, choices, and explanations as escaped text. There is no `dangerouslySetInnerHTML`, direct `innerHTML`, `document.write`, or dynamic script generation.

The production policy nevertheless includes `script-src 'unsafe-inline'`. If a future HTML injection sink is introduced, this weakens CSP's ability to contain it.

**Evidence**

- [`next.config.ts`](next.config.ts#L11) includes `'unsafe-inline'` in `script-src`.
- Repository-wide sink scan found no React/DOM HTML escape hatch.

**Fix**

Keep React escaping as the primary control. When stronger defense is justified, adopt Next.js nonce-based CSP or evaluated SRI support and remove production `'unsafe-inline'`. Nonces force dynamic rendering and have caching/cost tradeoffs, so this is not urgent while no injection sink exists.

### SEC-05 — Raw internal errors are returned to clients

**Severity:** Low  
**Category:** Information disclosure / attack assistance

Several mutation routes return `error.message` directly. This already exposed a PostgreSQL syntax error in the UI and can reveal provider, schema, validation, or library details.

**Evidence**

- [`documents/upload`](src/app/api/documents/upload/route.ts#L70)
- [`account/change-password`](src/app/api/account/change-password/route.ts#L17)
- [`admin/users`](src/app/api/admin/users/route.ts#L30)

**Fix**

Return stable public messages for unexpected failures and log detailed errors server-side. Preserve specific messages only for deliberate validation outcomes such as invalid metadata, forbidden access, or size limits.

### SEC-06 — Vulnerable transitive development tooling is installed

**Severity:** Low  
**Category:** Dependency / development environment

`npm audit --omit=dev` reports four Moderate package records caused by one advisory: `@esbuild-kit/core-utils` installs `esbuild@0.18.20`, affected by [GHSA-67mh-4wv8-2f99](https://github.com/advisories/GHSA-67mh-4wv8-2f99). The issue allows a malicious website to read responses from an exposed esbuild development server.

The affected copy is under Drizzle tooling and is not the esbuild copy used by the production Next.js application. Exploitability therefore depends on running affected development tooling and exposing its server to an untrusted network.

**Fix**

- Never expose development or Drizzle tooling to a public interface.
- Monitor Better Auth/Drizzle Kit updates for removal of the old `@esbuild-kit` chain.
- Do not accept npm's suggested forced downgrade to `drizzle-kit@0.18.1` without compatibility testing.

## Category conclusions

### 1. Broken Access Control / IDOR — Needs one fix

Strong controls found:

- All attempt reads/writes scope IDs to `session.user.id`.
- Student result access requires ownership, submitted state, and latest-result status.
- Every admin page, server action, user-management endpoint, exam-source download, and upload token request performs a server-side admin check.
- Document IDs are resolved through authenticated application routes; students can access only active-class documents. All students sharing all active classes is intentional product policy.
- Admin user operations reject self-targeting, missing users, and other administrators.

Remaining issue: SEC-01 lifecycle authorization.

### 2. SQL Injection — No vulnerability found

- Drizzle query builders parameterize request IDs, names, statuses, filenames, answers, and CSV content.
- The one raw upload-cap query uses Drizzle's SQL template for values, producing bind parameters.
- Its dynamic identifiers come only from static schema column names via `sql.identifier`, never from requests.
- No query string concatenation, `sql.raw` with input, or direct database driver query containing user data was found.

Continue using query builders and bind parameters. Never replace schema-derived identifiers with request-controlled strings.

### 3. Cross-Site Scripting — No direct vulnerability found

- React automatic escaping covers every reviewed text render.
- No dangerous HTML/DOM sink exists.
- CSV errors are URL-encoded before redirect and escaped when rendered.
- Download filenames strip quotes, backslashes, CR, and LF.
- CSV is returned as an attachment with `nosniff`; PDFs use an explicit MIME type and `nosniff`.
- CSP, frame denial, referrer policy, and permissions policy are present.

Remaining defense-in-depth issue: SEC-04. PDF active-content risk is covered separately by SEC-03.

### 4. Credential Stuffing / Brute Force — Partially protected

Strong controls found:

- Atomic database-backed Better Auth rate limiting.
- Stricter custom rules for login and signup.
- Shared signup code compared with timing-safe hashes.
- Reserved administrator username.
- Random 20-character temporary passwords that expire after first login use and force password change.
- Password changes revoke other sessions.
- Banning a user through Better Auth revokes that user's sessions.
- Session cookies default to `HttpOnly`, `SameSite=Lax`, and `Secure` when the configured base URL is HTTPS.
- `.env` is ignored, no real credential was found in tracked files or `.env` history.

Remaining issue: SEC-02.

### 5. File Upload Attack — Strong baseline, content scanning gap

Strong controls found:

- Only administrators can obtain upload tokens or manually finalize uploads.
- Vercel callback signatures are verified by the Blob SDK.
- Only PDF extension/MIME is allowed; file and total-storage limits exist.
- Server re-checks Blob metadata and signature after upload.
- Random suffixes prevent overwrite collisions.
- Files remain in private object storage and are delivered through authenticated routes.
- Student access stops when a class is archived.
- Original filenames are length-limited and sanitized before metadata/display/header use.

Remaining issue: SEC-03. One orphaned Blob from earlier failed local finalization also remains; it is not registered or reachable through the application.

## Priority order

1. Fix SEC-01 before relying on unpublish/archive as an immediate withdrawal control.
2. Strengthen administrator authentication under SEC-02 before public deployment.
3. Establish a trusted-PDF policy now; add scanning/CDR before accepting untrusted uploads.
4. Replace raw internal error responses.
5. Harden CSP when its rendering tradeoffs are acceptable.
6. Monitor and remove the affected development dependency chain.

## References

- [OWASP IDOR Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Insecure_Direct_Object_Reference_Prevention_Cheat_Sheet.html)
- [OWASP SQL Injection Prevention](https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html)
- [OWASP XSS Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)
- [OWASP Authentication](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [OWASP Credential Stuffing Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Credential_Stuffing_Prevention_Cheat_Sheet.html)
- [OWASP File Upload](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html)
- [Better Auth Rate Limiting](https://better-auth.com/docs/concepts/rate-limit)
- [Better Auth Security](https://better-auth.com/docs/reference/security)
- [Next.js Data Security](https://nextjs.org/docs/app/guides/data-security)
- [Vercel Blob Security](https://vercel.com/docs/vercel-blob/security)
- [Vercel Blob Private Storage](https://vercel.com/docs/vercel-blob/private-storage)
