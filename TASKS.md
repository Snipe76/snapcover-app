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

- [ ] Set `CRON_SECRET` in Vercel environment variables (generate a random 32-char string)
- [ ] Add Vercel cron schedule to `vercel.json`:
  ```json
  { "crons": [{ "path": "/api/cron/check-expiry", "schedule": "0 8 * * *" }] }
  ```
- [ ] Generate VAPID keys (`web-push generate-vapid-keys`)
- [ ] Add VAPID keys to Vercel env vars (`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`)
- [ ] Create `app/api/notifications/subscribe/route.ts` — save push subscription to DB
- [ ] Create `app/api/notifications/unsubscribe/route.ts` — remove push subscription
- [ ] Wire up service worker to call `/api/notifications/subscribe` on `pushsubscriptionchange` event
- [ ] Integrate Resend — add `RESEND_API_KEY` to Vercel env vars
- [ ] Replace `sendEmailFallback` `console.log` in cron route with real Resend API call
- [ ] Verify cron fires correctly (check Vercel function logs after cron is live)

### P1 — Settings Notification Toggles

- [ ] Add `notification_preferences` column to `warranties` or a separate `user_preferences` table
- [ ] Wire up Settings toggles → save preferences to DB
- [ ] Update cron to respect per-warranty notification preferences

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
