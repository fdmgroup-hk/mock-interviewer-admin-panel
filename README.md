# Mock Interview Admin Panel

Read-only admin dashboard for browsing interview sessions and reports stored in Supabase.

## Features

- OTP magic-link sign in
- Allowlist-based access gate (`admin_allowlist` table)
- Sessions list with filters (status, type, user_id, title, date range)
- Session details panel (questions, summaries, reports)
- CSV export for filtered sessions

## Prerequisites

- Node.js 22+
- npm
- Supabase project used by `webcam-interview-analyzer-js`

## Environment

Copy `.env.example` to `.env` and set values:

```bash
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
```

## Local development

```bash
npm ci
npm run dev
```

## Quality checks

```bash
npm run lint
npm run test
npm run build
```

## Supabase access control setup

Apply migration in the main repo:

- `webcam-interview-analyzer-js/supabase/migrations/20260821_admin_allowlist.sql`

Then seed allowlisted admins, for example:

```sql
insert into public.admin_allowlist (user_id, email, is_active)
values
	('<auth-user-uuid>', 'admin@company.com', true);
```

Only users present and active in `admin_allowlist` can read cross-user interview data.

## GitHub Pages deployment

Workflows are in:

- `.github/workflows/deploy-pages.yml`

Deployment behavior:

- Deploys on every push to `main`
- Uses `actions/upload-pages-artifact` + `actions/deploy-pages`

Required repo secrets:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Required repo setting:

- GitHub Pages source set to **GitHub Actions**
