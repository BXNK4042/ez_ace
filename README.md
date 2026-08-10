# EZ_ACE

Private PDF and CSV exam app for one admin and a small student group.

## Local setup

1. Copy `.env.example` to `.env`; fill every value.
2. Run `npm run db:migrate`.
3. Run `npm run db:seed` once.
4. Run `npm run dev`.

Tests: `npm test`. Static checks: `npm run lint && npx tsc --noEmit`. Production check: `npm run build`.

Requirement evidence and remaining live gates: [`docs/launch-audit.md`](docs/launch-audit.md).

## Vercel launch

1. Import repository as a Vercel Hobby project.
2. Create Neon Postgres; set `DATABASE_URL` in Development, Preview, Production.
3. Create a **private** Blob store and connect it to all environments. Vercel supplies `BLOB_READ_WRITE_TOKEN`.
4. Set `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `SIGNUP_CODE`, `ADMIN_USERNAME`, `ADMIN_PASSWORD` separately per environment.
5. Run migrations and admin seed against production `DATABASE_URL`, then deploy.
6. Keep original PDFs/CSVs on local storage. Never use Blob as sole copy.
7. Check Vercel Usage, Neon storage/compute, and Blob storage monthly. App rejects PDFs above 25 MB and total registered PDF storage above 750 MB.
8. Invite 1–2 students first. Verify signup, PDF preview/download, interrupted attempt resume, scoring, password reset, and mobile layout before wider invite.

Client uploads send PDFs directly to Blob, avoiding Vercel Function's 4.5 MB request limit. Authenticated finalization also makes local uploads work without a public callback tunnel.
