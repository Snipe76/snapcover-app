# SnapCover — State of the App

> **What it is:** Receipts + Warranty tracking app. Users photograph receipts, we auto-extract the details, track warranties, and send reminders before they expire.
>
> **Status:** MVP complete. Currently in polish + feature phase.
> **Last updated:** 2026-03-28
>
> **How to verify a task is done:** Each task has a "Code evidence" field listing the exact files + lines to check.

---

## The Big Picture

SnapCover is not just a warranty tracker — it's a **receipt life-cycle app**. Receipts are first-class citizens, not an afterthought. Users should feel confident that:
- Every purchase is saved as a receipt
- Warranties are automatically tracked from those receipts
- They never lose track of what they bought or how long it's covered

The experience should feel like a **trusted record-keeper** — calm, clear, organized.

---

## Current App Structure

```
/ (landing)          → Marketing page, sign up CTA
/login               → Auth (sign in / sign up)
/app                 → Home: warranty list + FAB add menu
/app/add             → Add flow: camera/library → OCR → 2-step form
/app/warranty/[id]   → Detail view: receipt image, warranty info, reminders
/app/settings        → Account, notifications, data, danger zone
/privacy             → Privacy policy
/terms               → Terms of service
```

---

## What's Working

- OCR receipt reading (Tesseract.js)
- Warranty list with filter (all/active/expiring/expired) + sort
- Expiry badges with countdown
- Push notification subscription flow
- Daily cron email reminders
- Receipt image storage in Supabase
- Dark mode via CSS variables
- Delete warranty/receipt (proper button — ✅ 1.3)
- Service worker + VAPID push
- Terms of Service page with real content ✅ (1.7)
- Privacy Policy page with real content ✅ (1.7)
- Delete account confirmation with "DELETE" input ✅ (3.5)

---

## Session Log

> After each work session, summarize what was done. Keep this updated.

```
2026-03-28 — Audit + refinement
- Ran full codebase review against TASKS.md
- Verified each task against actual source code
- Corrected inaccurate task descriptions
- Marked done items (1.3, 1.7, 3.5)
- Added missing tasks found during review
- Fixed: expiry_asc sort bug (receipts sort to top incorrectly)
- Added: missing push-denied state (3.2)
- Added: missing confirm-before-losing-form-data (5.12)
- Added: missing FAB menu animation (2.5) — CSS has no transition
```

---

## Phase 1 — Critical UX Fixes

> Things that are broken or actively hurt the user experience. Do these first.

---

### 1.1 — Clear (X) button on form fields
**Status:** TODO
**Problem:** OCR extracts noisy/garbage text into form fields. User has to manually select-all and delete.
**Solution:** Add a small X button at the right edge of every pre-filled text input (item name, store, order number, serial number, notes). Tapping it clears the field. Only shows when the field has content.
**Implementation:**
- Wrap the input in a `fieldWrap` div with `position: relative`
- Position the X button absolutely on the right inside the input (with `padding-right` to not cover text)
- Show X only when `input.value.length > 0`
- Same style as the number input's existing remove button in notification days
- Fields that need it: `item_name`, `store_name`, `order_number`, `serial_number`, `notes`
- CSS already has `.input` class — no new CSS module needed unless layout requires it
**Code evidence:** `src/app/app/add/page.tsx` — form fields around line 150–220

---

### 1.2 — Purchase date defaults to today
**Status:** TODO
**Problem:** The purchase date field starts empty. User adding a receipt manually has to open the date picker and pick today — an unnecessary tap.
**Solution:** Default `purchase_date` to today's date (`new Date().toISOString().split('T')[0]`) when initializing the form. Only override if OCR detected a date and the user hasn't manually changed it.
**Implementation:**
- In `DEFAULT_FORM`, set `purchase_date: new Date().toISOString().split('T')[0]` (already has empty string — change this)
- In the OCR result handler: only set `purchase_date` if `result.purchase_date` is truthy — otherwise leave today's date
- Add a visual hint ("Today" label or calendar icon) to make it clear this is pre-filled
- ⚠️ When `source=manual`, the date should default to today. When OCR extracts a date, it overrides.
**Code evidence:** `src/app/app/add/page.tsx` — `DEFAULT_FORM` around line 36, `processImage` around line 70

---

### 1.3 — Delete warranty/receipt as proper button
**Status:** ✅ DONE
**Code evidence:** `src/app/app/warranty/[id]/DeleteForm.tsx` — `className={styles.deleteBtn}` is a proper `<button>`, not plain text

---

### 1.4 — Edit + Archive warranty/receipt
**Status:** TODO
**Problem:** Users cannot edit any field after saving. A wrong store name or date is permanent.
**Solution:** Add an "Edit" button on the warranty detail page. Tapping it opens the same 2-step form pre-filled with the existing data, in edit mode. Save updates instead of inserts.
**Implementation:**
- Add `mode: 'create' | 'edit'` state to AddPage
- When navigating from detail page, pass `?warrantyId=<id>&mode=edit` or similar
- The form needs to handle UPDATE vs INSERT — check `warrantyId` param on mount
- Load existing warranty data from Supabase when in edit mode
- Change "Save" button label to "Update" when editing
- On save: call `supabase.from('warranty').update(...)` instead of `.insert(...)`
**Archive option (separate):**
- Add `status: 'archived'` to warranties, filter `neq('status', 'archived')` in the list query
- Show archived items in a separate "Archived" filter tab
- Add archive action to a three-dot menu or icon button on the warranty detail page
- **Schema already supports it:** `WarrantyStatus` in types.ts already includes `'archived'`
- **⚠️ RLS concern:** Check that RLS policies on `warranties` table allow selecting/deleting by `user_id` only — they should already, but verify
**Code evidence:** `src/app/app/add/page.tsx` — `handleSave` around line 150, `src/app/app/warranty/[id]/page.tsx` — detail page, `src/components/features/WarrantyList.tsx` — list filtering

---

### 1.5 — Push notification: add to homescreen education
**Status:** TODO (partially done — hint exists, education text missing)
**Problem:** Push notifications only work reliably on mobile when the site is added to homescreen. Most users don't know this.
**Solution:** On the settings page, near the push notification toggle, add an info box:
> "To receive push notifications on your phone, tap the share button in your browser and select **Add to Home Screen**."
**Implementation:**
- Add this education box below the toggle in `SettingsClient.tsx`
- Show it only when `pushEnabled === false` (before they enable it)
- Optional: illustrated 3-step guide (share button → Add to Home Screen → Done)
- Currently there IS a hint but it just says "Enable to receive browser push notifications" — replace with the above
**Code evidence:** `src/app/app/settings/SettingsClient.tsx` — around the toggle row (~line 100)

---

### 1.6 — Disable email notifications
**Status:** TODO
**Problem:** Users can only get email notifications. They should be able to turn them off.
**Solution:** Add an email notification toggle in settings. When disabled, the cron API skips email sends for that user.
**Implementation:**
- Add `email_notifications: boolean` column to a new `user_preferences` table (or add to `warranties` table if keeping it simple)
- Create `user_preferences` table: `id`, `user_id`, `email_enabled`, `push_enabled`
- Add toggle in Settings → Notifications section: "Email reminders" with on/off switch
- In cron API (`src/app/api/cron/check-expiry/route.ts`): join against `user_preferences`, skip email if `email_enabled === false`
- ⚠️ The `notification_prefs` table mentioned in the old task does NOT exist — create new table
- ⚠️ **Migration needed:** `CREATE TABLE user_preferences (...)` + RLS policies
**Code evidence:** `src/app/api/cron/check-expiry/route.ts` — cron logic, `src/app/app/settings/SettingsClient.tsx` — toggle pattern

---

### 1.7 — Update Terms and Privacy Policy
**Status:** ✅ DONE
**Code evidence:** `src/app/terms/page.tsx` and `src/app/privacy/page.tsx` — both have real, accurate content. Last updated March 25, 2026.

---

## Phase 2 — Polish & Flow Improvements

> Things that make the app feel complete and trustworthy. Do after Phase 1.

---

### 2.1 — Empty states everywhere
**Status:** TODO
**Problem:** Empty warranty list has an empty state, but empty search results is just a text message. Other views may lack guidance.
**Solution:**
- Empty search results: already shows `"No items match..."` text — make it more helpful with a suggestion
- Each filter tab (active/expiring/expired) with 0 items should explain why
- Consider illustrated empty states with SVG icons (receipt icon, search icon) — already has one for the main empty state
**Code evidence:** `src/components/features/WarrantyList.tsx` — `noResults` and `sorted.length === 0 && !hasItems` blocks

---

### 2.2 — Success feedback after saving
**Status:** TODO
**Problem:** After saving, user is redirected to `/app` with no confirmation.
**Solution:** Show a brief toast: "Warranty saved!" that appears at the top, auto-dismisses after 3s or on scroll. Use a simple animated banner — no external library needed.
**Implementation:**
- In `src/app/app/page.tsx` (home page): detect `?saved=true` in URL, show a dismissible toast banner
- Use a CSS animation: slide down from top, fade out after 3s
- Remove `?saved=true` from URL after showing (so refresh doesn't re-show it)
**Code evidence:** `src/app/app/page.tsx` — home page, `src/app/app/add/page.tsx` — redirects to `/app?saved=true` on success

---

### 2.3 — Field-level form validation
**Status:** TODO
**Problem:** Validation errors show in a top-level banner, not next to the offending field.
**Solution:** Show inline errors below each field. On invalid submit attempt, scroll to first error. Remove the top-level error banner.
**Implementation:**
- Add per-field error state: `errors: Record<string, string>`
- Show `<p role="alert" className={styles.fieldError}>` below the relevant input
- `handleNext` and `handleSave` should populate `errors` instead of (or in addition to) `error`
- On submit with errors: `document.getElementById(firstErrorFieldId)?.scrollIntoView()`
**Code evidence:** `src/app/app/add/page.tsx` — `handleNext` ~line 110, `error` state usage

---

### 2.4 — Back navigation in header
**Status:** TODO (title exists, chevron + router.back() missing)
**Problem:** On `/app/warranty/[id]` and `/app/add`, there's no back button — user has to use the bottom nav or browser back.
**Solution:** In `AppShell`'s `getTitle()` (which already returns "Details" and "Add item"), add a back chevron SVG next to the title on those pages. The chevron calls `router.back()`.
**Implementation:**
- Modify `getTitle()` to return a React node (or add a separate `getHeaderContent` function)
- On detail and add pages, show chevron-left + title
- The chevron is a `<button>` calling `router.back()` with `aria-label="Go back"`
- Style: chevron in `var(--text-secondary)`, title in `var(--text-primary)`
**Code evidence:** `src/components/features/AppShell.tsx` — `getTitle()` at bottom of file

---

### 2.5 — FAB menu animation
**Status:** TODO (menu opens instantly, no animation)
**Problem:** The add menu appears instantly with no animation.
**Solution:** Scale + fade in menu items with stagger (40–50ms between items). Backdrop fades in (150ms).
**Implementation:**
- Add CSS transitions to `.addMenu` and `.addMenuItem` in `AppShell.module.css`
- `.addMenu`: `opacity: 0; transform: scale(0.95) translateY(8px)` → `opacity: 1; transform: scale(1) translateY(0)` over 200ms
- `.addMenuItem`: stagger with `transition-delay` on each item (0ms, 40ms, 80ms)
- `.backdrop`: `opacity: 0` → `opacity: 1` over 150ms
- Currently there are NO transitions on `.backdrop` or `.addMenu` at all
**Code evidence:** `src/components/features/AppShell.module.css` — `.addMenu`, `.backdrop`; `src/components/features/AppShell.tsx` — `menuOpen` rendering

---

### 2.6 — Touch feedback on list items
**Status:** TODO
**Problem:** WarrantyCard has no press feedback — tap feels flat.
**Solution:** Add `transform: scale(0.98); opacity: 0.9` on `:active` via CSS.
**Implementation:**
- Check `WarrantyCard.tsx` for existing active states
- Add to the card's CSS module: `:active { transform: scale(0.98); opacity: 0.9; }`
- Verify it doesn't conflict with existing transitions
**Code evidence:** `src/components/features/WarrantyCard.tsx` and its CSS module

---

### 2.7 — Retake/replace receipt photo
**Status:** TODO
**Problem:** On step 2 of the add flow, user can't change the receipt photo if it came out blurry.
**Solution:** Add a small "Retake" button below the receipt thumbnail on step 2. Tapping it navigates back to step 1 with the image still in memory (or re-triggers camera).
**Implementation:**
- Add a "Retake photo" button below the `receiptTap` text in step 2
- On click: store current `imageDataUrl` in `sessionStorage`, navigate to `?source=camera` or trigger the hidden camera input
- Or: simply navigate back to step 1 with the image still shown — the user can tap the thumbnail to open lightbox and retake
**Code evidence:** `src/app/app/add/page.tsx` — step 2 render, around `receiptPreview` section

---

### 2.8 — Purchase date cannot be in the future
**Status:** TODO
**Problem:** User can set purchase date to tomorrow, which makes no sense.
**Solution:** Add `max={new Date().toISOString().split('T')[0]}` to the date input. Show inline error if they somehow bypass it.
**Implementation:**
- On the date input for `purchase_date`: add `max` attribute
- When 1.2 (purchase date defaults to today) is done, this becomes the default `max` automatically
- No need for JS-side validation if HTML `max` is set
**Code evidence:** `src/app/app/add/page.tsx` — `purchase_date` input field

---

### 2.9 — Sort options — expiry_asc bug
**Status:** TODO (incorrect sort behavior)
**Bug:** When sorting by `expiry_asc`, receipts (which have `expiry_date = ""`) sort to the **top** because `""` sorts before any real date string. Receipts should always appear at the bottom when sorting by expiry.
**Current behavior (wrong):**
```typescript
return (a.expiry_date || '').localeCompare(b.expiry_date || '');
// "" < "2026-03-28" → receipts come FIRST
```
**Correct behavior:** Push receipts to end explicitly:
```typescript
const aIsR = (a.type ?? 'warranty') === 'receipt';
const bIsR = (b.type ?? 'warranty') === 'receipt';
if (aIsR && !bIsR) return 1;
if (!aIsR && bIsR) return -1;
return (a.expiry_date || '').localeCompare(b.expiry_date || '');
```
**Note:** The `days_left` sort already handles this correctly with `99999` for null values. But `expiry_asc` does not.
**Code evidence:** `src/components/features/WarrantyList.tsx` — `sorted` useMemo, `expiry_asc` case

---

### 2.10 — Loading skeleton for warranty list
**Status:** TODO
**Problem:** Home page is blank while data loads — feels like a bug.
**Solution:** Show 3–4 placeholder warranty cards (skeleton shimmer) while the Supabase query resolves. Create `WarrantyListSkeleton.tsx`.
**Implementation:**
- Create `src/components/features/WarrantyListSkeleton.tsx` — renders 3–4 skeleton cards with shimmer animation
- In `src/app/app/page.tsx`: show skeleton while `warranties` is loading
- CSS shimmer: gradient animation `background: linear-gradient(90deg, var(--surface) 25%, var(--surface-elevated) 50%, var(--surface) 75%)` with `background-size: 200% 100%`
- `Skeleton.tsx` already exists in `src/components/ui/Skeleton.tsx` — check if reusable
**Code evidence:** `src/app/app/page.tsx` — data fetching + render, `src/components/ui/Skeleton.tsx` — existing skeleton

---

### 2.11 — Expiry preview prominence on add form
**Status:** TODO
**Problem:** "Expires January 15, 2027" is small and easy to miss when setting warranty length.
**Solution:** Make it larger, accent-colored, placed above the warranty length input — not below it. Make it feel like a real date, not an afterthought.
**Implementation:**
- In `add.module.css`: style `.expiryPreview` to be larger, use `var(--accent)` color for the date
- Move the `<p className={styles.expiryPreview}>` above the warranty length input in the JSX
- Current font-size is 14px — bump to 16px or 17px, add font-weight
**Code evidence:** `src/app/app/add/page.tsx` — `expiryPreview` render, `src/app/app/add/add.module.css` — `.expiryPreview`

---

## Phase 3 — Settings & Notifications

> Settings is currently sparse. Expand it to feel like a proper app.

---

### 3.1 — Organize settings into categories
**Status:** TODO (partially done — section headers exist but not all categories)
**Problem:** Settings is a flat list of unrelated sections.
**Solution:** Group into logical sections with section headers (already partially done in CSS):
```
Account
  Email, Sign out, Delete account

Notifications
  Push notifications (with homescreen education — see 1.5)
  Email reminders (toggle — see 1.6)

Data
  Export all items

About
  Version, Privacy Policy, Terms of Service
```
**Implementation:**
- Reorganize `SettingsClient.tsx` to match the above structure
- Add "Coming soon: Pro features" card placeholder (see 3.3)
- Add links to Privacy Policy and Terms in the About section
**Code evidence:** `src/app/app/settings/SettingsClient.tsx` — section structure

---

### 3.2 — Push permission denied state
**Status:** TODO (never implemented)
**Problem:** If user denies push permission, the toggle silently stays off.
**Solution:** When `Notification.permission === 'denied'`, show a hint below the toggle: "Notifications blocked. Enable in your browser settings."
**Implementation:**
- Check `Notification.permission` before rendering the toggle
- Add a `pushDenied` state that gets set on mount if `Notification.permission === 'denied'`
- Show warning text + link to browser notification settings instead of the toggle
- ⚠️ This is different from `pushSupported` — `denied` means the user explicitly blocked it
**Code evidence:** `src/app/app/settings/SettingsClient.tsx` — `pushSupported` check ~line 20

---

### 3.3 — Subscription placeholder card
**Status:** TODO
**Problem:** Settings has no mention of plans/pricing — looks incomplete.
**Solution:** Add a card: "Current plan: Free — [Coming soon: Pro features]" so it doesn't feel unfinished.
**Implementation:**
- Add new section "Plan" with a card showing Free tier
- Include a "Coming soon" badge on any pro features that aren't built yet
- This sets expectations for users that there's more coming
**Code evidence:** `src/app/app/settings/SettingsClient.tsx` — after Account section

---

### 3.4 — Logout confirmation
**Status:** TODO
**Problem:** "Sign out" immediately signs out with no confirmation.
**Solution:** Add a brief "Sign out?" confirmation — Cancel / Sign out buttons.
**Implementation:**
- Wrap `handleLogout` with a confirmation state (similar pattern to delete account confirmation)
- Show `confirmOverlay` with "Sign out?" title, cancel + sign out buttons
- `handleLogout` is called only after confirmation
**Code evidence:** `src/app/app/settings/SettingsClient.tsx` — `handleLogout` around line 160, `confirmOverlay` pattern from delete account

---

### 3.5 — Delete account — improve confirmation screen
**Status:** ✅ DONE
**Code evidence:** `src/app/app/settings/SettingsClient.tsx` — `showDeleteConfirm`, `deleteInput`, `confirmOverlay` around line 175. Has "DELETE" input, warning text, cancel + delete buttons.

---

## Phase 4 — Landing Page

> Landing page needs work to convert visitors into sign-ups.

---

### 4.1 — Feature highlights section
**Status:** TODO
**Problem:** After the hero, the flow to "how it works" is unclear.
**Solution:** Add a 3-column feature section below the hero:
- 📷 "Photograph your receipt" — we read the details automatically
- ⏰ "We track your warranties" — expiry dates managed for you
- 🔔 "Never miss an expiry" — push + email reminders
**Code evidence:** `src/app/page.tsx` — landing page

---

### 4.2 — Social proof
**Status:** TODO
**Problem:** No indication that real people use this.
**Solution:** Add "Trusted by X users" or a single testimonial placeholder. Even "Join X users tracking their warranties" builds trust.
**Note:** Requires a way to count users — could add a simple API route that returns a count, or just use a static placeholder.
**Code evidence:** `src/app/page.tsx` — landing page

---

### 4.3 — Privacy reassurance near CTA
**Status:** TODO
**Problem:** Users are uploading receipts — they care about data privacy.
**Solution:** Add small text near the sign-up button: "Your receipts are private. We never sell your data."
**Code evidence:** `src/app/page.tsx` — near sign-up CTA

---

### 4.4 — How it works clarity
**Status:** TODO
**Problem:** The #how-it-works section should be crystal clear.
**Solution:** Show 3 numbered steps: 1. Photograph → 2. We read it → 3. Track everything. Use simple icons, short labels.
**Code evidence:** `src/app/page.tsx` — `#how-it-works` section

---

### 4.5 — Verify all nav links work
**Status:** TODO (untested)
**Problem:** Landing page nav "Sign in" and "Get started" links should work correctly.
**Solution:** Verify `/login` and `/login?mode=signup` links from landing page work. Check the landing page's `<nav>` links.
**Code evidence:** `src/app/page.tsx` — nav links

---

## Phase 5 — Additional UX Ideas

> Improvements I can think of — review and decide what fits.

---

### 5.1 — Claimed warranty state
**Status:** TODO
**Problem:** If a user makes a successful warranty claim, there's no way to mark it.
**Solution:** Add a "Mark as claimed" action. Show a "Claimed ✓" badge on the warranty card.
**Implementation:**
- Add `claimed: boolean` column to `warranties` table (migration needed)
- Add "Mark as claimed" button on detail page (after delete, or in a menu)
- WarrantyCard: show "Claimed" badge when `claimed === true`
- Filter could add a "Claimed" status tab

---

### 5.2 — Receipt-first home view
**Status:** TODO
**Problem:** Currently the home shows warranties. Receipts (type=receipt) show up too but their purpose isn't clear.
**Solution:** Consider showing two sections on home: "Warranties" (active warranties) and "Receipts" (recent receipts without warranties). Or a toggle.
**Implementation:**
- Requires UX decision — may need separate "Receipts" tab or a split view
- Big change — discuss with Jeka before implementing

---

### 5.3 — Warranty cards show receipt thumbnail
**Status:** TODO
**Problem:** Warranty cards don't indicate if there's a receipt image attached.
**Solution:** Show a small receipt icon or thumbnail on warranty cards that have a `receipt_url`.
**Implementation:**
- In `WarrantyCard.tsx`: check `warranty.receipt_url`, show a small camera/receipt icon
- Position: bottom-right of the card, or in the metadata row
**Code evidence:** `src/components/features/WarrantyCard.tsx`

---

### 5.4 — Search by serial/order number
**Status:** TODO (partially done — already searching serial/order)
**Problem:** Search by serial/order number may not be working.
**Verification:** The `WarrantyList.tsx` search filter already includes `serial_number` and `order_number` — test this to confirm it works.
```
w.serial_number?.toLowerCase().includes(q) ||
w.order_number?.toLowerCase().includes(q) ||
```
**Code evidence:** `src/components/features/WarrantyList.tsx` — `matchesSearch` filter

---

### 5.5 — Category management
**Status:** TODO (out of scope for now)
**Problem:** Categories are hardcoded.
**Note:** Deferred to Phase 6. Big change — requires UX work.

---

### 5.6 — Multi-receipt support
**Status:** TODO (out of scope for now)
**Problem:** A single receipt might cover multiple items.
**Note:** Phase 6 at earliest. Big project.

---

### 5.7 — Share warranty details
**Status:** TODO
**Problem:** User might want to share a warranty summary.
**Solution:** A share button on the detail page that copies a text summary to clipboard.
**Implementation:**
- Add share button on detail page
- `navigator.clipboard.writeText()` with formatted summary
- Show brief "Copied!" toast

---

### 5.8 — Warranty extend / renewal
**Status:** TODO
**Problem:** If a user gets an extended warranty, there's no way to record that.
**Solution:** "Extend warranty" action on detail page — updates `warranty_months` and recalculates `expiry_date`.
**Implementation:**
- Add "Extend warranty" button on detail page
- Opens a mini-form: new warranty length + unit
- Calculates new expiry from current purchase date + new length
- Updates `warranty_months` and `expiry_date` in DB

---

### 5.9 — Batch archive/delete
**Status:** TODO
**Problem:** Users can only delete/archive one warranty at a time.
**Solution:** Long-press or multi-select mode on the list.
**Implementation:**
- Add a "Select" mode toggle on the list toolbar
- Each card gets a checkbox in select mode
- Bottom bar appears with "Archive" / "Delete" actions for selected items
- ⚠️ Needs careful UX — can be error-prone

---

### 5.10 — Notification time preference
**Status:** TODO
**Problem:** Reminder time is set per-warranty. Users might want a global default.
**Solution:** Add a "Default reminder time" in Settings. New warranties inherit it.
**Implementation:**
- Add `default_reminder_time: string` to `user_preferences` table (from 1.6)
- When creating a new warranty, pre-fill `reminder_time` from user preferences
- Show "Default: 9:00 AM" hint in the reminder time input on the add form

---

### 5.11 — Keyboard shortcuts (web)
**Status:** TODO (low priority)
**Problem:** Power users on desktop have no keyboard navigation.
**Solution:** `/` or `n` to open add, `s` to search, `?` for help overlay.
**Implementation:**
- Add `useEffect` in `AppShell` or home page that listens for `keydown`
- Show a small `?` button in the UI that opens a shortcuts help overlay

---

### 5.12 — Confirm before losing form data
**Status:** TODO (found during review — was missing from original tasks)
**Problem:** User fills out a long form and accidentally taps Back — data is lost.
**Solution:** In `AddPage`, if form has been modified, show "You have unsaved changes. Leave anyway?" confirmation on navigation attempt.
**Implementation:**
- Track form "dirty" state: `const [dirty, setDirty] = useState(false)`
- Set `dirty = true` on any field change
- Use `router.beforePopState` or `useEffect` listening to `router.events` to intercept back navigation
- Or: use `window.onbeforeunload` for browser back/refresh
- Show `confirm('You have unsaved changes. Leave anyway?')` or a custom modal

---

## Phase 6 — Technical & Architecture

> Code quality, not user-facing. Do alongside polish.

---

### 6.1 — CSS variable audit
**Status:** TODO
**Problem:** Some components may still use hardcoded hex values instead of CSS variables.
**Solution:** Grep for hex colors in CSS modules: `grep -r "#[0-9a-fA-F]\{3,6\}" src/**/*.module.css`. Replace with `var(--...)` references.
**Implementation:**
- Run grep, review each occurrence, replace with semantic token
- Check dark mode looks correct for each change

---

### 6.2 — Focus-visible styles
**Status:** TODO
**Problem:** Some interactive elements may be missing `:focus-visible` rings.
**Solution:** Audit all buttons, inputs, links — ensure keyboard navigation has visible focus indicators.
**Implementation:**
- Grep for `:focus` in CSS modules (not `:focus-visible`)
- Add `:focus-visible` rings using `outline: 2px solid var(--accent); outline-offset: 2px`
- Remove `:focus` that just sets color/border without ring

---

### 6.3 — Spinner component consolidation
**Status:** TODO
**Problem:** Add page has a custom CSS spinner. Other pages have none or use text.
**Solution:** Create a shared `Spinner.tsx` component. Use it everywhere consistently.
**Implementation:**
- `src/components/ui/Spinner.tsx` — accepts `size` prop, exports both the SVG and a `SpinnerOverlay` wrapper
- Replace inline spinners in AddPage with this component
**Code evidence:** `src/app/app/add/add.module.css` — `.spinner` class, `src/app/app/add/page.tsx` — processing step

---

### 6.4 — Type safety — `any` types
**Status:** TODO
**Problem:** Some places may use `any` for convenience.
**Solution:** Find all `any` occurrences: `grep -r "any" src/`. Replace with proper types.
**Implementation:**
- `extractReceiptData` return type should be explicit — check `src/lib/ocr.ts`
- Any Supabase response types that use `any` should be typed
**Code evidence:** `src/lib/ocr.ts` — `extractReceiptData` function

---

### 6.5 — Logger audit
**Status:** TODO
**Problem:** Logger is imported everywhere but may be logging noise in production.
**Solution:** Keep INFO-level for meaningful events (save, delete, auth success/fail, push subscribe/unsubscribe). Remove DEBUG noise. Consider a `LOG_LEVEL` env var.
**Implementation:**
- Review all `logger.info` and `logger.debug` calls — demote debug to logger.debug or remove
- In production build, `logger.debug` should be no-ops (check current implementation)

---

### 6.6 — Supabase schema — user_preferences table
**Status:** TODO (notification_prefs does not exist)
**Problem:** `notification_prefs` table was planned but doesn't exist. Email/push preference should be per-user.
**Solution:** Create `user_preferences` table:
```sql
CREATE TABLE user_preferences (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email_enabled BOOLEAN NOT NULL DEFAULT true,
  push_enabled  BOOLEAN NOT NULL DEFAULT true,
  default_reminder_time TEXT DEFAULT '09:00',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);
-- RLS
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own preferences"
  ON user_preferences FOR ALL
  USING (auth.uid() = user_id);
```
**Code evidence:** `src/lib/db/types.ts` — add `UserPreferences` type

---

### 6.7 — Sentry — verify JAVASCRIPT-NEXTJS-5 is resolved
**Status:** TODO
**Problem:** There was one unresolved Sentry issue (hydration error).
**Solution:** After deploying current changes, check Sentry dashboard for new events on that issue. Close if resolved.
**Commands:**
```bash
sentry-cli issues list --org evgeniy-gutman --project javascript-nextjs
sentry-cli events list --org evgeniy-gutman --project javascript-nextjs --issue JAVASCRIPT-NEXTJS-5
```

---

### 6.8 — Migration drift
**Status:** ✅ DOCUMENTED
**Problem:** `supabase_migrations.schema_migrations` shows 0 rows — migrations were run manually.
**Note:** This is fine. Document it in a comment so no one tries to re-run migrations against production. Do NOT run `supabase migrate` against production.

---

### 6.9 — Resend domain verification
**Status:** TODO
**Problem:** `snapcover.app` domain is not verified in Resend — emails to external addresses fail.
**Solution:** Verify `snapcover.app` in Resend dashboard → add DNS TXT/MX records → switch `FROM_EMAIL` back to `noreply@snapcover.app`
**Code evidence:** `src/app/api/cron/check-expiry/route.ts` — `FROM_EMAIL` constant

---

### 6.10 — Sentry issue JAVASCRIPT-NEXTJS-5 hydration error (found during review)
**Status:** TODO
**Problem:** Server Components render error (SSR hydration) — the one unresolved Sentry issue.
**Solution:** Investigate the specific component causing hydration mismatch. Common causes:
- `Date()` called during render (varies between server and client)
- `Math.random()` or `Math.uuid()` during render
- Browser-only APIs used in server components
**Code evidence:** `src/app/app/page.tsx` — home page server component, check for `Date.now()` calls

---

## What We're Not Doing

_(Out of scope for now — revisit after Phase 1–4 are complete)_

- Admin panel / user management
- Paid subscription / billing
- Android or iOS native app
- Multi-item receipt splitting (OCR)
- Custom category management
- Social features / sharing
- Desktop keyboard shortcuts
- Batch operations

---

## How to Use This File

- **Doing a work session?** Start with Phase 1 items, work down.
- **After each session?** Update the "Session Log" at the bottom.
- **After each feature?** Move it from "In Progress" to "Session Log" entry.
- **New idea?** Add it to the appropriate phase or Phase 5.
- **Changed priority?** Move the item within the phase or to a different phase.
- **Decided not to do something?** Move it to "What We're Not Doing" or delete.
- **Before starting a task:** Check the "Code evidence" field — it tells you exactly what files to look at.
- **Task marked ✅?** Verify with code evidence before skipping — the task description may have been outdated.
