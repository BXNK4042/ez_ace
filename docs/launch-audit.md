# Launch audit

Status as of 2026-08-11. A checked item has current-state evidence; unchecked items need live provider or user evidence.

## Local evidence

- [x] `npm run lint`
- [x] `npx tsc --noEmit`
- [x] `npm test` — 4 CSV/scoring checks pass
- [x] `npm run build` — all application and API routes compile
- [x] Better Auth generated schema matches custom fields and database rate-limit types
- [x] Drizzle generated migrations without schema drift
- [x] All migrations apply to PostgreSQL runtime: 13 tables, archive keeps attempts, duplicate in-progress attempts rejected

## Phase gates

- Phase 1: [x] Next.js, TypeScript, Drizzle/Neon driver, migrations, protected layouts, CSS tokens. [ ] Production deployment connects to Neon.
- Phase 2: [x] Shared-code signup endpoint, username login, seven-day sessions, role guards, admin seed/user controls, one-use temporary password flow, database rate limits. [ ] Live signup/login/logout/deactivate/reset smoke test.
- Phase 3: [x] Class management, active dashboard, direct private Blob client upload, PDF signature/size/cap checks, authenticated range-aware preview/download, PDF.js covers. [ ] Live private Blob upload/preview/download smoke test.
- Phase 4: [x] Atomic CSV import, exact headers, required cells, answer letters, duplicate rows, 100-row limit, row errors, preview, publish/unpublish/archive, no editor. [ ] Import fixture against production Neon.
- Phase 5: [x] Persisted one-time permutations, one-question UI, navigation, autosave, resume, unanswered warning, unlimited attempts. [ ] Refresh/logout/interruption browser smoke test.
- Phase 6: [x] Server-only scoring, selected/correct/explanation review, latest-only student result, preserved admin history, known scoring fixture. [ ] Compare live fixture result.
- Phase 7: [x] Attempt table/details, first-attempt ranking, native CSS first/latest bars, no chart/export dependency. [ ] Review with real attempt data.
- Phase 8: [x] Server/API authorization, validation, secure headers, archive preservation, responsive CSS, provider limits and local-original checklist. [ ] Laptop/mobile browser test. [ ] Provider usage baseline. [ ] 1–2 friend pilot and friction fixes.

## Required external state

Set `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `SIGNUP_CODE`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`; connect a private Blob store; authenticate Vercel CLI. Then run migrations, seed one admin, deploy, and execute unchecked smoke tests.
