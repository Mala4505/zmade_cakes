# ZMade — Mobile Responsiveness & Feedback UX: Action Plan

**Created:** 2026-08-31
**Status:** Phase 0 + Phase 1 implemented 2026-08-31 (4 parallel subagents, `npx tsc --noEmit` clean, `graphify update .` run). Migration `036` created but **NOT yet run against Supabase** — owner must run it before the quantity-cap verify passes. Runtime/device verification of Phases 0/1 still pending.
**Phase 2 implemented 2026-08-31** (foundation hand-built + 5 parallel subagents by area, `npx tsc --noEmit` clean). New `lib/hooks/useAsyncAction.ts`; `NavPendingContext`/`NavigationOverlay` now a top progress bar fed by the hook; `app/api/upload/route.ts` hardened; §2.5 `onInvalid` on both inquiry forms + the public wizard; §2.7 `InquiryStatusSelect` revert-on-error. ~24 mutation sites migrated off `useTransition`. **§2.6 idempotency (request-key dedupe on `createInquiry`) deferred** — needs a schema decision; the hook's double-submit lock + the `orders.inquiry_id` unique constraint cover the common case.

**Phase 3 partially implemented 2026-08-31** (multi-session coordination — see below). This session's slice: primitives hand-built (`Input`/`Select`/`Textarea` size fix, `Button`/`RadioGroup` `min-h-11`, new `IconButton.tsx` + `FieldRow.tsx`, `--admin-tabbar-h` 56→64px, `Toaster mobileOffset`, `PinnedOrderTotal` `pb-20` clearance) + 2 parallel subagents (inquiries admin: ItemFields/InquiryForm/InquiryDetailForm/InquiryRowActions/InquiryFilterBar; orders+calendar: OrderEtaSection/CalendarView, `orders/[id]/page.tsx` correctly skipped — display-only grids). `npx tsc --noEmit` clean. **Session `zmade-b4` is concurrently completing the rest** (OptionsManager, BlackoutDatesManager, BusinessInfoForm, LoginForm, PricingTable, ItemList, SizeList, customers-page, Modal.tsx, AdminNav.tsx) in isolated worktrees, held uncommitted pending a merge signal — coordinate with that session (or check its worktree branches) before assuming those files are untouched. `graphify update .` still pending (deferred until after the multi-session merge). Runtime verification pending for Phases 0–3. Phases 4–5 not started.

**Multi-session note:** this repo had 4+ concurrent Claude sessions active on 2026-08-31 (`zmade-a8` = this session, `zmade-b4`, `zmade-c8`, `zmade-6d`, `zmade-c2`), not all working this plan. `zmade-a8` mistakenly `git checkout --`'d `zmade-b4`'s in-progress Phase 3 primitive edits early in the session (recovered — `zmade-b4` confirmed no harm, re-provided full context to its agents). Anyone resuming this plan should re-check `git status`/diff before assuming the working tree matches this doc.
**Companion artifact:** "ZMade on a Phone" — https://claude.ai/code/artifact/1cf06b13-cbe4-45c7-87ea-c5f79098ec2e
**Source:** three parallel read-only code audits (Opus mobile-responsiveness; Sonnet async/feedback; Sonnet qty-limit + validation sweep), 2026-08-31, against `zmade-new@master`.

Related: `ACTION-PLAN-customer-routes.md` (customer-route UX work — overlaps at `ConfirmForm`, `OrderForm`, `Navbar`, `Footer`).

---

## Context

Three problems reported by the owner:

1. **Invoice quantity is capped at 50** with no obvious reason.
2. **Customer-facing pages are not phone-responsive** — "can't see the phone number correctly, everything is blank, not phone-oriented."
3. **After any POST (create/save an inquiry etc.) the button spins forever** even though the record saved — no toast, no success indication.

All three are verified and reproducible from the code. The admin *shell* (bottom nav, mobile top bar, safe-area insets) is already well built; the damage is in page **content** — a handful of layouts designed at desktop width and never revisited — plus one async pattern repeated ~28 times.

---

## Decisions locked (owner, 2026-08-31)

| Question | Decision |
|---|---|
| Scope now | **Write this plan; execute later.** No code changes yet. |
| Quantity ceiling | **Effectively unlimited** — DB `CHECK (quantity >= 1)`, code keeps a `100000` sanity bound only to prevent an `INT` overflow from a typo. No real order hits it. |
| Other validation caps (price, notes, photos, free/comped cakes, whitespace names) | **Not now.** Quantity cap only. The rest are documented in **Appendix B** for a future decision — do **not** change them while executing this plan. |
| Toast position on admin | Open — default assumption below is "keep bottom, offset above the tab bar." Change to `top-center` only if the owner asks. |

---

## How to use this doc

- Phases are ordered and independently shippable. **Phase 0 is the minimum that clears all three reported issues.** Phases 1–5 are the systemic work that stops them recurring.
- Line numbers are **point-in-time (2026-08-31)** — re-grep before editing.
- After any code change: `npx tsc --noEmit` must stay clean, then `graphify update .` (per `CLAUDE.md`).
- Per the subagent scope-creep incident (see user memory): if any step is delegated to a subagent, **diff every file it touched**, not just the assigned ones.
- Each phase has a **Verify** block — do it before moving on.

---

## Phase 0 — Clear the three reported issues

Small, contained, high-confidence. Nothing here touches shared architecture.
**Estimate:** ~1 session · **Risk:** low · **Blocked on:** owner running migration `036`.

### 0.1 — Remove the quantity cap

Five enforcement points. All must change or the cap still bites.

| # | File | Current | Change to |
|---|---|---|---|
| 1 | `lib/validations/inquiryItem.ts:16-20` | `.min(1, 'Minimum 1 cake').max(50, 'Maximum 50 cakes')` | `.min(1, 'Minimum 1 cake').max(100000, 'That quantity looks wrong — contact us for very large orders')` |
| 2 | `lib/validations/publicInquiry.ts:33-39` | `.min(1, 'Minimum 1 cake').max(50, 'Maximum 50 cakes').optional().default(1)` | `.min(1, 'Minimum 1 cake').max(100000, 'That quantity looks wrong — contact us for very large orders').optional().default(1)` |
| 3 | `app/admin/inquiries/_components/ItemFields.tsx:269-278` | `<Input ... type="number" min={1} max={50} required ... />` | delete the `max={50}` line; keep `min={1}` |
| 4 | DB — `inquiry_items_quantity_check` (from `034_multi_item_inquiries.sql:25`, unnamed inline `CHECK (quantity >= 1 AND quantity <= 50)`) | — | dropped + re-added as `CHECK (quantity >= 1)` by migration `036` |
| 5 | DB — `inquiries_quantity_check` (legacy, from `002_create_inquiries.sql:25`, `CHECK (quantity > 0 AND quantity <= 50)`) | — | same — migration `036`. Column is no longer written by any insert/update (verified: `inquirySchema`/`publicInquirySchema` have no `quantity` key), always sits at `DEFAULT 1`; dropped for schema hygiene. |

**Migration:** create `supabase/migrations/036_remove_quantity_cap.sql` — full SQL in **Appendix C**. The owner runs it against Supabase (connector not authorised for automated runs).

**Notes for the executor:**
- The `100000` bound is an overflow guard, **not** a business rule — `INT` maxes at 2,147,483,647 and Zod `.int()` alone is unbounded. If the owner later wants truly no bound, switch `inquiry_items.quantity` to `BIGINT` in a follow-up migration and drop the `.max()`.
- **No pricing math uses quantity** — the admin types `admin_price` as the subtotal directly (`lib/payments.ts` works off `admin_price`/`discount`/`delivery_charge`/`amount_paid` only). Confirmed there is nothing to recompute.
- The public wizard (`app/inquire/_components/OrderForm.tsx`) has **no quantity control** — `defaultItem()` omits it, schema defaults to `1`. Change #2 is purely defensive; no customer can currently hit it.
- Display sites that render `quantity` and are safe for 3–4 digits (no change needed): `InvoiceLayout.tsx:200`, `InvoicePdfDocument.tsx:323`, `lib/format.ts:41` (`orderSummary`), `app/confirm/[token]/page.tsx`, `app/track/[token]/page.tsx`.

### 0.2 — Create-inquiry: success feedback + navigation out of the transition

**File:** `app/admin/inquiries/_components/InquiryForm.tsx`, `onSubmit` (currently ~line 300-372).

**Problem:** the create path (`!inquiry`) shows **no `toast.success`** (compare the edit path in `InquiryDetailForm.tsx:302` which does `toast.success('Saved')`), and `router.push()` runs **inside** `startTransition`, so `isPending` — and the submit button's spinner — stays lit until the destination route (`app/admin/inquiries/[id]/page.tsx`, ~11 queries in 3 waves) finishes rendering. On mobile data that is 3–8s of an unlabelled spinner *after* the inquiry is already saved.

**Change (minimal, Phase 0):**
1. On the success branch (after `result.error` / `result.fieldErrors` checks, ~line 353), before navigating:
   ```ts
   toast.success(inquiry ? 'Changes saved' : 'Order created')
   ```
2. Move the navigation **out** of `startTransition`. Simplest: capture the target id inside the transition, then navigate in a `.then`/after the transition, or refactor `onSubmit` so the `await createInquiry(...)` is done, `pending` is allowed to clear, and *then* `router.push`. Pattern:
   ```ts
   const onSubmit = (data: FormOutput) => {
     startTransition(async () => {
       try {
         // ... existing work up to and including the createInquiry/updateInquiry call ...
         if (result.error) { toast.error('Failed to save', { description: result.error }); return }
         if (result.fieldErrors) { /* setError loop */ return }
         toast.success(inquiry ? 'Changes saved' : 'Order created')
         // stash where to go; navigate AFTER the transition so the button stops spinning now
         navigateTo.current = inquiry
           ? `/admin/inquiries/${inquiry.id}`
           : `/admin/inquiries/${result.data!.id}`
       } catch (err) { /* existing catch */ }
     })
   }
   // effect: when !isPending && navigateTo.current, router.push(navigateTo.current) (+ router.refresh() for the edit case)
   ```
   (Phase 2 replaces this hand-rolled dance with `useAsyncAction` — see below. For Phase 0, the `toast.success` alone removes ~80% of the perceived bug; the navigation move removes the rest.)
3. Swap the button label while pending — `app/admin/inquiries/_components/InquiryForm.tsx` submit button (~line 841-842):
   ```ts
   {pending ? (inquiry ? 'Saving…' : 'Creating…') : (inquiry ? 'Save Changes' : 'Create Order')}
   ```

### 0.3 — Fix the two infinite spinners

**File:** `app/admin/orders/[id]/_components/OrderDetailActions.tsx` — `handleAdvance` (~line 41) and `handleCancel` (~line 54).

Both call `startAdvance(async () => {...})` / `startCancel(async () => {...})` with **no try/catch**. If `updateOrderStatus` / `cancelOrder` *throw* (rather than return `{error}`), `advancing` / `cancelling` stay `true` forever → "Mark Delivered" / "Cancel Order" spins indefinitely with no toast.

**Change:** wrap each body, copying the pattern already in `OrderStatusActions.tsx:31-44`:
```ts
const handleAdvance = () => {
  if (!next) return
  startAdvance(async () => {
    try {
      const result = await updateOrderStatus(order.id, next.status)
      if (result.error) { toast.error(result.error); return }
      toast.success('Status updated')
      router.refresh()
    } catch (err) {
      console.error('[OrderDetailActions] advance failed:', err)
      toast.error('Something went wrong', { description: err instanceof Error ? err.message : 'Please try again.' })
    }
  })
}
```
Same shape for `handleCancel`.

### 0.4 — Phone field: mobile layout

**Problem:** on `/admin/inquiries/new`, the Name+Phone row is `grid grid-cols-2 gap-4` (`InquiryForm.tsx:379`) that never collapses. At 360px each column ≈ 139px; the `PhoneInput` country trigger is `shrink-0` with a hard `minWidth: '88px'` (`components/PhoneInput.tsx:239`), leaving ~23px for the number. This is the literal "can't see the phone number" report.

**Changes:**
1. `app/admin/inquiries/_components/InquiryForm.tsx:379` — `grid grid-cols-2 gap-4` → `grid grid-cols-1 sm:grid-cols-2 gap-4`. (Phone gets full width below `sm`.)
2. `components/PhoneInput.tsx:232-244` — on the country `<button>`: remove `style={{ minWidth: '88px' }}`; add `min-w-0` and let it size to content. Optionally hide the `{country.code}` text span below `sm` (keep flag + caret) so the trigger is ~44px on the narrowest screens.
3. Also check `InquiryDetailForm.tsx` — the edit form uses a plain `<Input {...register('customer_phone')}>` (`~line 338`), not `PhoneInput`, so it's not squeezed, but its containing grid should still get the `sm:` treatment (covered in Phase 3's grid sweep).

### 0.5 — Phone parsing: contained quick fixes

**File:** `components/PhoneInput.tsx` only. (The broader `normalizePhone` / `wa.me` consolidation is Phase 4.)

**Problems:**
- `COUNTRIES` (`:6-20`) omits Iraq `+964`, Syria `+963`, Yemen `+967`, Philippines `+63`, Sri Lanka `+94`, Bangladesh `+880`, Indonesia `+62`, Nepal `+977` — large Kuwait expat communities. A stored number with one of these renders as a 🇰🇼 badge glued to a `+964…` number.
- `parseValue` (`:24-33`) only matches `value.startsWith(c.code)` where `c.code` includes the literal `+`. A value stored as `965…` or `00965…` (legacy rows, `normalizePhone` output) matches nothing → country digits shown duplicated in the field.
- `handleLocalChange` (`:118-122`) does `onChange(country.code + val)` with no sanitisation → editing a mis-parsed value yields `+965+964…` (embedded `+`), which then fails `KUWAIT_PHONE_REGEX` (`/^\+?[0-9\s\-]{7,20}$/`, leading `+` only).

**Changes:**
1. Add the missing dialling codes to `COUNTRIES`.
2. In `parseValue`: before matching, normalise the input — strip a leading `00`, then treat a bare leading `965`/`966`/… as if it had a `+`. Match against `c.code` with the `+` stripped from both sides. If still no match and the value starts with `+`, keep the leading `+<digits>` in the country slot as an "unknown code" rather than pasting it into `local`.
3. In `handleLocalChange`: `const clean = e.target.value.replace(/[^\d]/g, '')` before `setLocal` / `onChange`.

### Phase 0 — Verify

- [ ] `npx tsc --noEmit` clean.
- [ ] Admin: create an inquiry with an item quantity of **500** → saves, appears on the invoice as `500`, no validation error. (Requires migration `036` applied first — coordinate with owner.)
- [ ] Admin create inquiry on a 390px viewport (devtools) → `toast.success('Order created')` fires, button reads "Creating…", lands on the detail page; spinner does not outlive the toast by more than a moment.
- [ ] Force `updateOrderStatus` to throw (temporary `throw new Error('x')` in the action) → "Mark Delivered" shows an error toast and the button re-enables. Revert the throw.
- [ ] `/admin/inquiries/new` at 360px → the phone number field shows a full 8-digit number without truncation.
- [ ] Paste `+9647701234567` (Iraq) into the phone field → shows an Iraq badge (or an "unknown code" slot), not a 🇰🇼 badge with `+964…` in the number box; saving does not produce `+965+964…`.
- [ ] `graphify update .`

---

## Phase 1 — The three clipped layouts

Same root bug in all three: non-wrapping wide content inside a card with `overflow-hidden` (used for the rounded corners), which **clips** instead of wrapping/scrolling.
**Estimate:** ~1 session · **Risk:** low.

### 1.1 — Invoice / receipt header
**Files:** `components/InvoiceLayout.tsx` (header ~`:91`, `:113-119`; card `overflow-hidden` at `:78`), `components/PaymentReceiptLayout.tsx` (`:37`, `:50`, `:72-78`).
- Header `div`: add `flex-wrap gap-3` and `min-w-0` on both children.
- "INVOICE" / "RECEIPT" word: `text-4xl` → `text-2xl sm:text-4xl`; inline `letterSpacing: '0.2em'` → `0.12em` on small screens (or a responsive class).
- Verify the `ZM-YYYY-NNNN` invoice number stays visible.
- Applies to `/invoice/[token]`, `/receipt/[token]`, `/admin/orders/[id]/invoice`.

### 1.2 — Calendar toolbar
**File:** `app/admin/calendar/_components/CalendarView.tsx` (toolbar `:102-157`; card `overflow-hidden` ~`:487-493`).
- Toolbar `:103`: add `flex-wrap gap-y-2`.
- Month label span `:133`: `truncate min-w-0`.
- Below `md`: force `view='agenda'` (or `'day'`) — react-big-calendar's month grid is unusable at ~47px/column. Wire a `useEffect` / media query that sets the view and hides the month/week/day switcher on small screens.
- The month grid `minHeight: 560` should not apply on mobile agenda view.

### 1.3 — Analytics revenue chart
**File:** `app/admin/analytics/page.tsx` (`:143` card `overflow-hidden`, `:155-173` bar row).
- Bar column div `:159`: add `min-w-0`; drop `whitespace-nowrap` on the `text-[9px]` label (`:173`) — or show `months.slice(-6)` below `sm`.
- Alternative: make the chart row `overflow-x-auto` with an explicit `min-w-[520px]` inner track.
- Check the other `overflow-hidden` wide cards flagged: `analytics BarList` (~`:225`), `customers/page.tsx:84`, `OptionsManager.tsx:173`.

### Phase 1 — Verify
- [ ] `/invoice/[token]` at 360px → "INVOICE" + number fully visible, header wraps cleanly.
- [ ] `/admin/calendar` at 360px → agenda list, no clipped controls.
- [ ] `/admin/analytics` at 360px → the most recent month is visible (scroll or fit).
- [ ] `npx tsc --noEmit` clean; `graphify update .`

---

## Phase 2 — The form-feedback pattern (systemic)

The root of reported issue 3. One pattern repeated ~28×: a mutation fires, then `router.refresh()`/`router.push()` runs **inside** the loading transition, pinning the spinner to a full server re-render instead of the actual write. Plus missing success toasts and silent validation no-ops.
**Estimate:** ~2 sessions · **Risk:** medium · **Touches ~28 files.**

### 2.1 — `useAsyncAction` hook
New: `lib/hooks/useAsyncAction.ts`. Contract:
- Owns `pending` + `error`; **guarantees** `pending` resolves on both success and throw paths (structurally impossible to forget try/catch).
- Built-in double-submit lock.
- Optional `successToast: string`.
- Optional `onSuccess` callback that runs **after** `pending` clears (so navigation never keeps the button spinning).
- Returns `{ run, pending, error }`.

Migrate all `startTransition(async () => { try {...} catch {...} })` sites onto it. Inventory (re-grep `startTransition(async` + the renamed dispatchers `startAdvance`/`startCancel`):

`InquiryForm.tsx` · `InquiryDetailForm.tsx` · `InquiryRowActions.tsx` · `InquiryActions.tsx` · `CancelInquiryButton.tsx` · `InquiryStatusSelect.tsx` · `OrderStatusActions.tsx` · `OrderDetailActions.tsx` (×2) · `OrderEtaSection.tsx` · `PaymentHistorySection.tsx` (×2) · `FlavorList.tsx` · `FlavorDetail.tsx` (×2) · `SizeList.tsx` (×2) · `ItemList.tsx` (×2) · `PricingPanel.tsx` · `OptionsManager.tsx` (×4) · `OperatingRulesForm.tsx` · `BusinessInfoForm.tsx` · `BlackoutDatesManager.tsx` (×2) · `WhatsAppTemplatesForm.tsx` · `NotificationSettingsForm.tsx` · `ConfirmForm.tsx` · `OrderForm.tsx` · `ItemFields.tsx` (`handleCreateItem`).

### 2.2 — Navigation always outside the transition
Every `router.push` / `router.refresh` moves to the `onSuccess` callback (post-`pending`). Sites: `InquiryDetailForm.tsx:303`, `InquiryRowActions.tsx:71`, `InquiryActions.tsx:60`, `InquiryStatusSelect.tsx:83`, `OrderStatusActions.tsx:37`, `OrderDetailActions.tsx:49/63`, `OptionsManager.tsx:27`, `PaymentHistorySection.tsx:133`.

### 2.3 — `toast.success` on every mutation success, no exceptions
Currently missing entirely: `InquiryForm.tsx` create path (done in Phase 0), `OptionsManager.tsx` (all 4 handlers), `BlackoutDatesManager.tsx` (both). Also add a `catch` (not just `finally`) to `FlavorImageUpload.tsx:26/44`. Standardise copy: "Order created" / "Changes saved" / "Deleted" / "{Thing} added".

### 2.4 — Form-aware route-progress bar
Extend `components/admin/NavPendingContext.tsx` + `NavigationOverlay.tsx` (or add a thin `useRouter` wrapper) so `router.push`/`router.refresh` from **forms** — not just sidebar `<Link>`s (`AdminNav.tsx:72-82`) — drive a top-of-viewport progress bar. Today the overlay is blind to form submits.

### 2.5 — RHF `onInvalid` on the three big forms
`InquiryForm.tsx:376`, `InquiryDetailForm.tsx:315`, `OrderForm.tsx:425` — `handleSubmit(onValid)` has no invalid handler. Add one that: `toast.error('Check the highlighted fields')` + focus/scroll to the first `[aria-invalid="true"]` (wizard: jump to that field's step — reuse `OrderForm.tsx`'s existing `:366-374` step-jump logic for the client path).

### 2.6 — Idempotency + API hardening
- `createInquiry` (`lib/actions/inquiries.ts:35`): add a client-generated request key / short server-side dedupe window (`confirmInquiry` already has one at `:374-429` — mirror it).
- `app/api/upload/route.ts:9`: wrap the POST body in try/catch → `NextResponse.json({ error }, { status: 500 })` (mirror `app/api/inquiries/route.ts:142-145`) so the client always gets JSON.

### 2.7 — Small correctness fixes found along the way
- `InquiryStatusSelect.tsx:86-91` — the `catch` doesn't restore `selected`/`editing`; the widget is left stuck in edit state on error.

### Phase 2 — Verify
- [ ] Every button in the mutation inventory: on success → toast + spinner stops promptly; on forced throw → error toast + button re-enables. (Spot-check ~6 across inquiries/orders/products/settings.)
- [ ] Submit `InquiryForm` with a deliberately invalid off-screen field → toast + scroll to it.
- [ ] Double-tap "Create Order" fast on a throttled connection → exactly one inquiry, one notification.
- [ ] Route-progress bar shows during the post-create navigation.
- [ ] `npx tsc --noEmit` clean; `graphify update .`

---

## Phase 3 — Mobile input & layout primitives

Fix once at the primitive level; the app inherits it.
**Estimate:** ~1–2 sessions · **Risk:** medium (wide but mechanical).

### 3.1 — Kill iOS zoom app-wide
`components/ui/Input.tsx` (`sizeClass`/`inputBaseClass` ~`:12-30`), `Select.tsx` (`:6-8`), `Textarea.tsx` (`:5-7`) default to `text-sm` (14px) → iOS Safari zooms on focus and never returns.
- Make `inputBaseClass` carry `text-base md:text-sm` (phones get 16px, desktop keeps density), or flip the default `size` to `'base'` and let desktop opt into `sm`.
- Then convert the 7 hand-rolled `text-sm` inputs to the `Input` primitive: `BusinessInfoForm.tsx:61/83`, `LoginForm.tsx:26/59`, `OptionsManager.tsx:152/204`, `BlackoutDatesManager.tsx:152` (+ its `date_to` twin), `InquiryFilterBar.tsx:62`, `customers/page.tsx:73`, `PricingTable.tsx:51`.

### 3.2 — 44px touch targets
- `components/ui/Button.tsx:19-23` — add `min-h-11` to `sm` and `md` (`md` is currently 40px, `sm` 28px).
- `components/ui/RadioGroup.tsx:96` — `min-h-11` on the option button (currently 36px).
- New `components/ui/IconButton.tsx` at 44px (copy the `min-h-11 min-w-11 -m-2` pattern from `components/PhotoTile.tsx:41-42` / `AdminNav.tsx:392`). Replace the sub-44px icon buttons: `ItemFields.tsx:137`, `InquiryRowActions.tsx:90`, `CalendarView.tsx:110/119/127/147`, `BlackoutDatesManager.tsx:109`, `OptionsManager.tsx:211/214`, `ItemList.tsx:217`, `SizeList.tsx:218`, `Modal.tsx:147`, `AdminNav.tsx:91`.

### 3.3 — Responsive field rows
New `components/ui/FieldRow.tsx` = `grid grid-cols-1 sm:grid-cols-2 gap-4`. Codemod the ~12 hard-coded `grid grid-cols-2` sites and change every `col-span-2` → `sm:col-span-2`:
`ItemFields.tsx:146` (biggest share — shared by both admin forms), `InquiryForm.tsx:379/515/534/565`, `InquiryDetailForm.tsx:458/475/516`, `orders/[id]/page.tsx:80/133`, `BlackoutDatesManager.tsx:137`.

### 3.4 — Toaster + tab-bar tokens
- `app/layout.tsx:58` — `<Toaster position="bottom-right" mobileOffset={{ bottom: 'calc(var(--admin-tabbar-h) + var(--safe-b) + 16px)' }} />` (or `position="top-center"` on admin routes if the owner prefers).
- `app/globals.css:99` — `--admin-tabbar-h: 56px` → `64px` (real height = `min-h-[56px]` + `paddingBottom: calc(var(--safe-b) + 8px)` per `AdminNav.tsx:242/285`). Then derive the bar's own padding from the token instead of re-adding `8px` inline.
- `PinnedOrderTotal` — with the token fixed, confirm it no longer overlaps the bar; add `pb-20` to the form root when `PinnedOrderTotal` can render.

### Phase 3 — Verify
- [ ] Focus any admin input on iOS Safari (or responsive iOS emulation) → no viewport zoom.
- [ ] Every button/radio/icon-control ≥ 44px (spot-check with devtools).
- [ ] All form rows single-column below 640px.
- [ ] A save toast on `/admin/calendar` does not cover the tab bar.
- [ ] `npx tsc --noEmit` clean; `graphify update .`

---

## Phase 4 — Inquiries mobile list + phone parsing

**Estimate:** ~2 sessions · **Risk:** medium.

### 4.1 — `/admin/inquiries` mobile card list
`app/admin/inquiries/page.tsx:237-244` renders a 5-column `<table>` (`colgroup` widths 110+140+130+90 + auto) in only an `overflow-x-auto` wrapper; only "Customer" is on-screen at 328px. The skeleton (`loading.tsx:23-25`) already renders a mobile card list that never got built for the real page.
- Wrap the table in `hidden md:block`.
- Add `block md:hidden` card list modelled on `app/admin/orders/_components/MobileOrderList.tsx` (name + one-line summary + event date + payment + inline status select).
- Extract the shared shape into `components/ui/ResponsiveList.tsx` and also apply to `/admin/customers`.

### 4.2 — `/admin/orders` mobile status actions
`OrderStatusActions` renders only inside the desktop kanban card; `MobileOrderCard` has no equivalent (`orders/page.tsx:229`). Render it inside the mobile card — needs unwrapping the card from the outer `<Link>` (which currently swallows nested buttons).

### 4.3 — Phone parsing (full)
- Finish the `PhoneInput.tsx` rewrite started in Phase 0.5 (full dialling-code list, `00`/bare-prefix matching, sanitised handler, "unknown code" slot).
- `lib/utils.ts:24` `normalizePhone` — `phone.replace(/\D/g,'').replace(/^(?!965)/,'965')` mangles `00965…` → `9650096…` and Saudi `+96650…` → `9659665…`. Rewrite: strip a leading `00`/`+`, then only prepend `965` when the remaining number has no recognisable country code and is the right length for a local Kuwait number.
- Route all `wa.me` link construction through one helper (`lib/whatsapp.ts` `whatsappUrlNoText()`); replace the hand-rolled `.replace(/^(?!965)/, '965')` in `app/confirm/[token]/page.tsx:47`, `app/track/[token]/page.tsx:51`, `app/not-found.tsx:18`.

### 4.4 — Customer contact visibility
- `app/inquire/layout.tsx:13` — make it `async`, pass `getBusinessContactSettings()` to `<Navbar>` (as `/confirm`, `/track`, `/my-orders` already do). Same for `app/confirm/[token]/loading.tsx:11`.
- Surface the business phone as **copyable digits** (not just a WhatsApp link) somewhere in the viewport on customer pages — e.g. in `Navbar` or a slim contact strip.
- Fix the always-below-fold footer: change customer-page roots from `min-h-svh` to `flex-1` (the `body` flex column already fills the viewport). Roots: `app/inquire/layout.tsx:12`, `app/confirm/[token]/page.tsx:99`, `app/track/[token]/page.tsx:112`, `MyOrdersClient.tsx:175`, `app/invoice/[token]/page.tsx:38`, `app/receipt/[token]/page.tsx:61`, `app/not-found.tsx:23`, `app/_components/LandingPage.tsx:220`.

### Phase 4 — Verify
- [ ] `/admin/inquiries` at 360px → readable card list, status changeable inline.
- [ ] Numbers stored as `+964…`, `00965…`, `96550…` (Saudi) all render correctly and produce working `wa.me` links.
- [ ] `/inquire` header shows the Instagram/contact line.
- [ ] On `/confirm/[token]` at 360px, a contact affordance is visible without scrolling.
- [ ] `npx tsc --noEmit` clean; `graphify update .`

---

## Phase 5 — Polish

**Estimate:** ~1 session · **Risk:** low.

- **Unify breakpoints on `lg`** for shell-coupled swaps. Fix the 768–1023px double-render/duplication: `OrderDetailActions.tsx:169/185/202` (`hidden md:flex` → `hidden lg:flex`), `components/public/Footer.tsx:18` (`hidden md:flex` → `hidden lg:flex`), `ProductsClient.tsx:90` (`md:h-svh` → `md:h-full`).
- **Delete `app/(admin)/`** — 8 empty directories, 0 files, inert.
- **Modal → bottom sheet on mobile** — `components/ui/Modal.tsx`: full-width, bottom-anchored, drag handle, `flex-col-reverse sm:flex-row` + `w-full sm:w-auto` on footer buttons (fixes "Continue to WhatsApp" wrapping in `EditOrderModal.tsx`).
- **Touch fallbacks for hover-only affordances** — `ImageGallery.tsx:72` and `FlavorImageUpload.tsx:80`: `opacity-100 md:opacity-0 md:group-hover:opacity-100` + 44px hit area. Add an `@media (hover: hover)` guard convention.
- **`MobileOrderList.tsx:56`** — `className="block ... flex flex-col ..."` — drop the redundant `block`.
- **`PinnedOrderTotal.tsx:22-31`** — `IntersectionObserver` uses `root: null` but the real scroller is `AdminScrollRegion`; pass the scroll region as `root`.
- **Re-run `/impeccable critique`** on the customer routes (`app-order-confirm-track-customer-routes` slug — see `ACTION-PLAN-customer-routes.md`) to catch regressions from Phases 1/3/4.

---

## Appendix A — Full mobile findings (reference)

### P1 — broken on a phone
| Finding | Location |
|---|---|
| Admin phone input ~23px wide at 360px | `InquiryForm.tsx:379` · `PhoneInput.tsx:239` |
| `/admin/inquiries` has no mobile layout (5-col table) | `app/admin/inquiries/page.tsx:237` |
| Invoice/receipt header clipped by `overflow-hidden` | `InvoiceLayout.tsx:78/113` · `PaymentReceiptLayout.tsx:50` |
| Calendar toolbar clipped — view switcher unreachable | `CalendarView.tsx:103/488` |
| Analytics revenue chart clipped | `app/admin/analytics/page.tsx:143/159` |
| Customer contact always below the fold | `app/layout.tsx:55` + 8 page roots |

### P2 — painful
| Finding | Location |
|---|---|
| iOS auto-zoom on every admin input (14px primitives) | `components/ui/Input.tsx:12-14` (+ 7 hand-rolled) |
| ~12 `grid-cols-2` form rows never collapse | `ItemFields.tsx:146` + others |
| Toasts render over the bottom tab bar | `app/layout.tsx:58` |
| Shared `Button` (40/28px) + `RadioGroup` (36px) under 44px | `Button.tsx:19-23` · `RadioGroup.tsx:96` |
| Icon-only controls 23–33px | `ItemFields.tsx:137` · `BlackoutDatesManager.tsx:109` · `Modal.tsx:147` + more |
| Admin photo delete invisible on touch | `ImageGallery.tsx:72` · `FlavorImageUpload.tsx:80` |
| `/inquire` header has no contact info (`<Navbar>` no props) | `app/inquire/layout.tsx:13` |
| `PinnedOrderTotal` overlaps the tab bar (token 8px short) | `globals.css:98-109` · `AdminNav.tsx:285` |
| `/admin/orders` mobile list has no status actions | `orders/page.tsx:229` |

### P3 — polish
Two breakpoint systems (md vs lg) · modal footer buttons wrap at 360px · dead `app/(admin)/` route group · modal isn't a bottom sheet · `MobileOrderList.tsx:56` conflicting `block`+`flex` · `PinnedOrderTotal` IntersectionObserver root · nested `md:h-svh` in products page.

### Async / feedback findings
| Finding | Location |
|---|---|
| Create inquiry: no success toast, nav inside transition | `InquiryForm.tsx:300-364` |
| "Mark Delivered" / "Cancel Order" infinite spinner (no try/catch) | `OrderDetailActions.tsx:41/54` |
| `router.refresh()` inside transition on every edit | ~8 components (see Phase 2.2) |
| Forms silently no-op on hidden validation error | `InquiryForm.tsx:376` · `InquiryDetailForm.tsx:315` · `OrderForm.tsx:425` |
| Missing success toasts | `OptionsManager.tsx` · `BlackoutDatesManager.tsx` |
| Global nav overlay blind to form submits | `NavigationOverlay.tsx` · `NavPendingContext.tsx` |
| Double-submit window on create (no idempotency) | `lib/actions/inquiries.ts:35` |
| Upload API returns HTML on error | `app/api/upload/route.ts:9` |
| `InquiryStatusSelect` catch doesn't restore state | `InquiryStatusSelect.tsx:86-91` |

---

## Appendix B — Deferred / out of scope (do NOT change while executing this plan)

Owner decided 2026-08-31 to lift **only** the quantity cap. These other validation limits were found in the same sweep and are recorded here for a future decision — leave them exactly as they are:

| Field | Current | Would-be suggestion | Why it might matter |
|---|---|---|---|
| Price fields (`admin_price`, `amount_paid`, `discount`, `delivery_charge`, `deposit_amount`) | `.max(9999)` | `.max(99999)` — DB columns are `DECIMAL(8,3)` | A large order that clears the new quantity cap still hits the price wall at KD 9,999 |
| Free / comped cake | `.positive()` on price | `.min(0)` | Price 0 is rejected; admin must fake it with a discount |
| `message_on_cake` | `.max(255)`; admin input has no `maxLength` | `.max(500)` + add `maxLength` to `ItemFields.tsx:306` | Long bilingual message / verse; limit is a surprise at submit |
| `special_requirements` ("Cake Details") | `.max(1000)` | `.max(2000)` (matches `admin_notes`) | Detailed multi-tier wedding spec |
| Reference photos | `.max(6)` | `.max(12)` | Moodboard easily exceeds 6 |
| Items per order | `.max(20)` | `.max(50)` | Dessert-table order with many designs |
| Whitespace-only name passes `.min(2)` | `.min(2, ...).trim()` | reorder to `.trim().min(2, ...)` | `"  "` currently stores as empty |
| `clearThemeWhenNormal` silently wipes theme text | — | consider not wiping until submit | Toggle Normal → typed theme text is gone |

---

## Appendix C — Migration `036_remove_quantity_cap.sql` (full)

Create at `supabase/migrations/036_remove_quantity_cap.sql`. Pattern matches `035_remove_ready_status.sql` (name-agnostic constraint drop via `pg_constraint` loop). **Owner runs this against Supabase.**

```sql
-- 036_remove_quantity_cap.sql
-- Removes the hard 50-unit ceiling on per-item quantity. The owner routinely builds
-- inquiries/invoices for more than 50 of an item (corporate, wedding, event bulk orders)
-- and the cap forced splitting one order across several. Floor stays at 1; quantity stays
-- an integer. Mirrors the app-layer change in lib/validations/inquiryItem.ts,
-- lib/validations/publicInquiry.ts and app/admin/inquiries/_components/ItemFields.tsx.
--
-- Both constraints are unnamed inline column CHECKs, so Postgres auto-named them
-- <table>_quantity_check (002_create_inquiries.sql / 034_multi_item_inquiries.sql). The
-- pg_constraint loop also catches any non-standard name. Same pattern as
-- 035_remove_ready_status.sql / 018_remove_in_progress_status.sql.

-- 1. inquiry_items — the live per-item table the admin form writes to.
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'inquiry_items'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%quantity%'
  LOOP
    EXECUTE format('ALTER TABLE inquiry_items DROP CONSTRAINT %I', r.conname);
  END LOOP;
END $$;

ALTER TABLE inquiry_items
  ADD CONSTRAINT inquiry_items_quantity_check CHECK (quantity >= 1);

-- 2. Legacy inquiries.quantity — column still present (removal deferred at migration 034,
--    never carried out); no longer written by any insert/update; always at DEFAULT 1.
--    Drop the upper bound too so the schema is internally consistent.
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'inquiries'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%quantity%'
  LOOP
    EXECUTE format('ALTER TABLE inquiries DROP CONSTRAINT %I', r.conname);
  END LOOP;
END $$;

ALTER TABLE inquiries
  ADD CONSTRAINT inquiries_quantity_check CHECK (quantity >= 1);
```

**Rollback** (if ever needed): re-add `CHECK (quantity >= 1 AND quantity <= 50)` on `inquiry_items` and `CHECK (quantity > 0 AND quantity <= 50)` on `inquiries` — but only after confirming no row exceeds 50.

---

## Appendix D — Source audits

Three read-only subagent audits run 2026-08-31 (different models, disjoint scope):
1. **Mobile responsiveness** (Opus) — full route tree, all `_components`, `components/ui`, `components/admin`, `components/public`; reference viewports 320/360/390px.
2. **Async / feedback UX** (Sonnet) — all 28 `useTransition` mutation sites, both inquiry forms, the public wizard, confirm flow, orders/products/settings, image uploads, PDF buttons, `lib/actions/*`, the two API routes, `Button`/`Spinner`, `NavigationOverlay`.
3. **Quantity-limit trace + validation sweep** (Sonnet) — full trace of the 50 cap through schemas/input/DB; phone parse logic; every `.max()`/`.min()`/regex/`.trim()`/`.transform()` in `lib/validations/**` and the forms.

Full transcripts available on request. Key claims in Phase 0 were re-verified by hand against the code on 2026-08-31.
