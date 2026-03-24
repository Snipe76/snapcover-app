# SnapCover MVP — Tasks

> Adheres to SPEC.md. All items below must be completed before launch.

---

## Phase 1 — Landing Page + URL Restructure ✅

- [x] Create `app/page.tsx` — public landing page at `/`
- [x] Create `app/layout.tsx` — root layout (HTML shell, globals, skip link, toast root)
- [x] Create `app/app/page.tsx` — authenticated home (was `app/(app)/page.tsx`)
- [x] Move `(app)` routes → `app/app/...` (home, warranty/[id], add, notifications, settings)
- [x] Create `app/app/layout.tsx` — AppShell + auth guard (was `app/(app)/layout.tsx`)
- [x] Move `(auth)` routes → `app/login/page.tsx` + `app/callback/page.tsx`
- [x] Update callback to redirect to `/app` after success
- [x] Update login success redirect to `/app`
- [x] Update all nav links throughout app → new `/app` paths
- [x] Update `middleware.ts` redirect `/` → `/app`
- [x] Update callback URL in Supabase dashboard → `https://snapcover-app.vercel.app/callback`
- [x] Delete empty `(auth)` + old `(app)` route groups
- [x] Delete leftover `app/page.module.css`

---

## Phase 2 — Notifications Pipeline

### P0 — Cron + Push + Email

- [x] ~~Set `CRON_SECRET` in Vercel environment variables~~ — Added to `.env.local` + vercel.json (schedule already set)
- [x] ~~Add Vercel cron schedule to `vercel.json`~~ — Already configured
- [x] ~~Generate VAPID keys~~ — Generated: `BLnnl43wrRq5tRqCc7skYJwfpN1Njr7-FM-4ILvYxDUkR4k0s98yEKNimXRme6pUglHpTj4lzDj9omWQ9uuu2Lk`
- [x] ~~Add VAPID keys to Vercel env vars~~ — Added to `.env.local` (`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_EMAIL`)
- [x] ~~Create `app/api/notifications/subscribe/route.ts`~~ — saves push subscription to DB, handles `update` action
- [x] ~~Create `app/api/notifications/unsubscribe/route.ts`~~ — removes push subscription
- [x] ~~Wire up service worker `pushsubscriptionchange` event~~ — in `public/sw.js`
- [x] ~~Integrate Resend~~ — `RESEND_API_KEY` placeholder in `.env.local`; full Resend client in cron route
- [x] ~~Replace email fallback with real Resend API call~~ — full HTML email template in cron route

**Infrastructure added:**
- `public/sw.js` — service worker (push + notification click + subscription change)
- `src/lib/notifications.ts` — `subscribeToPush()`, `unsubscribeFromPush()`, `getExistingSubscription()`
- `src/app/api/notifications/subscribe/route.ts` — POST, saves subscription
- `src/app/api/notifications/unsubscribe/route.ts` — DELETE, removes subscription
- `src/app/api/cron/check-expiry/route.ts` — rewritten with `web-push` (VAPID) + Resend
- `supabase/migrations/002_notification_prefs.sql` — adds `notify_30_days`, `notify_7_days`, `notify_1_day`, `notify_expired` columns

**Still needs (manual — Vercel dashboard):**
- [ ] ~~Add all env vars from `.env.example` to Vercel~~ — Done via Vercel CLI + Vercel API ✅
- [ ] ~~Run `supabase/migrations/002_notification_prefs.sql`~~ — Done via direct Postgres connection ✅
- [ ] Get Resend API key from https://resend.com and add to Vercel `RESEND_API_KEY`

**Automated via Vercel API (2026-03-24):**
- Vercel env vars set: `CRON_SECRET`, `VAPID_EMAIL`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `NEXT_PUBLIC_APP_URL`
- Supabase migration `002_notification_prefs.sql` — 4 columns added to `warranties` table: `notify_30_days`, `notify_7_days`, `notify_1_day`, `notify_expired`
- [ ] Verify cron fires correctly (check Vercel function logs after cron is live)

### P1 — Settings Notification Toggles

- [x] ~~Add `notification_preferences` columns~~ — Done in migration `002_notification_prefs.sql`
- [x] ~~Wire up per-warranty notification preferences~~ — Added to add form: 30/7/1 day + expiry toggles, saved to DB with warranty insert
- [x] ~~Update cron to respect per-warranty notification preferences~~ — Already done in cron route (reads `notify_30_days`, `notify_7_days`, `notify_1_day`, `notify_expired`)

---

## Phase 3 — Core Feature Completions

- [ ] Edit warranty — inline edit on detail page (item name, store name, notes, purchase date, warranty length)
- [ ] Archive warranty — move to archived list instead of deleting
- [ ] Settings → Export JSON — query all warranties, return as downloadable `.json` file
- [ ] Settings → Delete account — `DELETE /api/users/me` → delete user + all their data from Supabase
- [ ] Status badge sync — ensure `status` field (active/expiring/expired) is updated by cron, not just client-side computation

---

## Phase 4 — Polish + Launch

- [ ] Dark mode — ensure all components render correctly in dark mode (review `--surface`, `--bg`, `--text-primary` in dark context)
- [ ] Error states — network error / offline state on home list with retry button
- [ ] Pull-to-refresh on warranty list (mobile)
- [ ] `apple-touch-icon.png` + `icon-192.png` + `icon-512.png` in `public/`
- [ ] Terms of Service page (`/terms`)
- [ ] Privacy Policy page (`/privacy`)
- [ ] `vercel.json` — add `headers` for proper caching / security headers
- [ ] Measure bundle size — run `npm run build` with bundle analyzer, confirm < 150KB gzipped
- [ ] Accessibility audit — run axe DevTools on all screens, fix any violations

---

## Phase 5 — Testing (Pre-Launch)

- [ ] Playwright E2E: sign up → add warranty → view detail → delete warranty
- [ ] Playwright E2E: add warranty via camera → OCR → confirm form → save
- [ ] Playwright E2E: notification settings toggle → verify saved
- [ ] Unit test: OCR date parsing (various formats)
- [ ] Unit test: warranty expiry calculation
- [ ] Unit test: status determination (active / expiring / expired)
- [ ] Visual regression: home screen (light + dark), warranty card states, add form, empty states

---

## Phase 6 — Post-Launch

> Deferred — not in MVP scope per SPEC.md.

- [ ] VAPID key rotation workflow
- [ ] Resend email template customization
- [ ] Notification preference centrepiece UI (in-app notification manager)
- [ ] Edit warranty length (warranty extension / renewal)
- [ ] Multi-item receipt parsing
- [ ] Category system
- [ ] Android / iOS native app

---

## Task Reference

### VAPID Key Generation
```bash
npx web-push generate-vapid-keys
```

### Cron Verification
```bash
# Trigger cron manually (requires CRON_SECRET)
curl -H "Authorization: Bearer $CRON_SECRET" https://snapcover-app.vercel.app/api/cron/check-expiry
```

### Resend Integration
```ts
// In /api/cron/check-expiry/route.ts
const res = await fetch('https://api.resend.com/emails', {
  method: 'POST',
  headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
  body: JSON.stringify({
    from: 'SnapCover <noreply@snapcover.app>',
    to: email,
    subject: 'SnapCover — Warranty expiring soon',
    html: `...`,
  }),
});
```

### Supabase Notification Preferences Schema
```sql
ALTER TABLE warranties ADD COLUMN notify_30_days BOOLEAN DEFAULT true;
ALTER TABLE warranties ADD COLUMN notify_7_days  BOOLEAN DEFAULT true;
ALTER TABLE warranties ADD COLUMN notify_1_day   BOOLEAN DEFAULT true;
```
