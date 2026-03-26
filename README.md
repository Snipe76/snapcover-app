# SnapCover

Never lose a warranty again. SnapCover lets you capture, store, and track your product warranties — with receipt photos, smart expiry alerts, and searchable records.

## Features

- 📸 **Receipt capture** — snap a photo or pick from gallery, OCR extracts the details
- 🏷️ **Categories** — organize warranties by product type
- 🔍 **Live search** — find any warranty instantly across name, store, notes, serial/order numbers
- ⏰ **Expiry reminders** — daily cron checks send push/email notifications before warranties expire
- 📱 **PWA** — works on mobile and desktop, installable to home screen
- 🌙 **Dark mode** — automatic via system preference

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15 (App Router), React, TypeScript |
| Styling | CSS Modules |
| Database | Supabase (PostgreSQL + Auth + Storage) |
| Auth | Magic link / email + optional Google OAuth |
| Push | Web Push API (VAPID) |
| Email | Resend |
| Hosting | Vercel |
| Error tracking | Sentry |

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SENTRY_DSN=
NEXT_PUBLIC_SENTRY_DSN=
CRON_SECRET=
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
NEXT_PUBLIC_VAPID_PUBLIC_KEY=
NEXT_PUBLIC_APP_URL=
RESEND_API_KEY=
```

## Database

Schema lives in `supabase/migrations/`. Apply manually via `psql` (Supabase CLI pooler is broken):

```bash
PGPASSWORD='<password>' psql \
  "postgresql://postgres.<ref>.pooler.supabase.com:5432/postgres" \
  -f supabase/migrations/<migration_name>.sql
```

## API

- `POST /api/cron/check-expiry` — triggered daily at 08:00 UTC by Vercel Cron. Sends push + email notifications for warranties expiring within 30 days. Requires `Authorization: Bearer <CRON_SECRET>`.
