# Action Plan — Customer Routes (/order, /confirm/[token], /track/[token])

Source: `/impeccable critique` run 2026-07-25 — score **25/40**, 0 P0 / 6 P1 / 5 P2.
Snapshot: `.impeccable/critique/2026-07-25T17-02-31Z__app-order-confirm-track-customer-routes.md`

**Workflow:** execute one phase → re-run `/impeccable critique` on the customer routes → compare score → next phase.
Suggested skill command per phase is noted; each phase is also executable as a plain task list.

---

## Phase 1 — Trust & Resilience (`/impeccable harden`)

The customer-facing failure states and data-loss paths. Highest damage, mostly small fixes.

- [x] **Branded 404** — create `app/not-found.tsx`: cream background, ZMade wordmark header (match `confirm/[token]/error.tsx` shell), short message ("We couldn't find that order link"), WhatsApp CTA. Covers invalid/expired/revoked tokens on `/confirm` and `/track`.
- [x] **Dead-end StatusPage** — `app/confirm/[token]/page.tsx:279-296`: add the branded header and a WhatsApp link to the cancelled / already-confirmed states (`waNumber` is already in scope; pass it in).
- [x] **Priceless confirm guard** — `app/confirm/[token]/page.tsx:137`: when `admin_price` is null, do NOT render a confirmable page silently missing the Total. Show a "price pending — we'll send an updated link" state (or disable Confirm with explanation). A customer must never confirm an unpriced order.
- [x] **Order wizard autosave** — `app/order/_components/OrderForm.tsx`: mirror form values + current step + reference image list to `sessionStorage` (debounced watch), restore on mount, clear on successful submit. WhatsApp's in-app browser evicts tabs routinely.
- [x] **Server errors on hidden steps** — `OrderForm.tsx:154-158`: when the API returns `fieldErrors`, find the first errored field's step via `STEP_FIELDS`, `setStep()` to it, and focus the field. Never leave the user on Step 4 with only a generic message.
- [x] **Empty "Request Changes"** — `app/confirm/[token]/_components/ConfirmForm.tsx`: require a non-empty customer message (or at least one changed field) before `request_changes` submits. Right now an empty request succeeds and Zainab receives nothing.
- [x] **Arabic input rendering** — add `dir="auto"` to free-text inputs and their rendered values: Message on Cake, Special Requirements, customer comments, theme, address notes (`ConfirmForm.tsx`, `OrderForm.tsx`, summary rows on confirm/track).

**Done when:** a bad token, a cancelled order, an unpriced order, a killed tab, and a step-1 server error all land somewhere branded and actionable.

---

## Phase 2 — Device & Accessibility Mechanics (`/impeccable adapt`)

- [x] **16px inputs** — `components/ui/Input.tsx:10` (and `Textarea`, `Select`, `PhoneInput.tsx`): `text-sm` → `text-base` (16px) on customer routes. DESIGN.md §5 rule; prevents iOS focus auto-zoom. Implemented as a `size?: 'sm' | 'base'` prop (default `'sm'`) so admin density is untouched; customer call sites (OrderForm, ConfirmForm, MyOrdersClient) pass `size="base"`.
- [x] **Re-enable zoom** — `app/layout.tsx:41`: delete `maximumScale: 1` from viewport. WCAG 1.4.4; iOS ignores it anyway, Android users are currently blocked from pinch-zooming prices.
- [x] **Visible focus ring** — `app/globals.css:78-82`: `outline: 2px solid var(--color-teal-light)` is ~1.1:1 on cream (invisible). Switched to `var(--color-teal)` (~6.3:1 on cream, ~5.9:1 on surface/teal-light tints).
- [x] **44px touch targets** — Edit toggles (`ConfirmForm.tsx`, `EditOrderModal.tsx`), photo remove button (`ReferencePhotoUpload.tsx`, `CustomerPhotoUpload.tsx`), footer "Message us →" link (`confirm/[token]/page.tsx`). Hit areas padded to 44px via `min-h-11`/44×44 wrapper buttons without growing the visible glyphs.
- [x] **Multi-photo upload** — `multiple` added to file inputs in `ReferencePhotoUpload.tsx` and `CustomerPhotoUpload.tsx`; both loop uploads respecting a 6-photo cap.
- [x] **Photo removal on /confirm** — `CustomerPhotoUpload.tsx` now has remove UI; added `DELETE /api/upload/public` (token + inquiry-ownership validated) to support it.
- [x] **Font loading on 4G** — `app/layout.tsx:9-26`: Bricolage Grotesque was loading as a full variable font (wght × opsz axes) with no weight limit. Narrowed to the 4 weights actually used (500/600/700/800), dropped the now-pointless `opsz` axis, switched to `display: 'optional'` for a jank-free first paint on single-visit customer links. Geist/Geist Mono left untouched (admin-shared, no clear win).
- [x] **`next/image` for cake photos** — `track/[token]/page.tsx:255-259` raw `<img>` replaced with `next/image` (`sizes="120px"`, default lazy loading, below-the-fold so no `priority`). Added `images.remotePatterns` to `next.config.ts` for the Supabase storage host.

**Done when:** axe/Lighthouse a11y passes on all three routes; focus is visible tabbing through /confirm; no iOS zoom jump on input focus.

---

## Phase 3 — Copy (`/impeccable clarify`)

- [x] **Step labels** — `OrderForm.tsx:255`: reworked to atelier voice — `['About You', 'Your Cake', 'When & Where', 'Review']`.
- [x] **Kill "Not set"** — `ConfirmForm.tsx:234-254`: pickup time / message on cake / special requirements rows now hide entirely when empty instead of showing "Not set"; delivery address fallback (required field) changed to actionable "Add your delivery address".
- [x] **Explain WAMD** — `confirm/[token]/page.tsx:167`: now reads "via WAMD (bank transfer by phone number)".
- [x] **"Raw sugar" ambiguity** — unified label `"Raw sugar (no refined sugar)"` across `OrderForm.tsx` (dietary checkbox + Step 4 review summary) and `confirm/[token]/page.tsx` (AllergenPill).
- [x] **Placeholder-repeats-label** — `OrderForm.tsx:450-462`: Area/Block/Street/House No. now use real examples ("e.g. Salmiya", "e.g. 4", "e.g. Street 12", "e.g. 12").
- [x] **What happens next on /order** — added before "Send My Order" (Step 4, `OrderForm.tsx:543-545`): "We'll review your order and send a confirmation link on WhatsApp, usually within a few hours."

**Done when:** every string on the three routes could plausibly have been written by a careful human at a high-end studio.

---

## Phase 4 — Brand Moments (`/impeccable bolder` + color discipline)

- [x] **/order editorial register** — added a display-font (`var(--font-display)`) heading/greeting above the stepper in `OrderForm.tsx`, in the /confirm hero's voice. Restyled the stepper: current step now reads as a teal ring/text accent (not a fill); completed steps use a `teal-light` wash + Phosphor check icon; connectors are neutral. Stepper teal-fill count: 0 — the page's one teal fill remains the CTA button.
- [x] **Peak-end: teal, not WhatsApp green** — `order/success/page.tsx`, `track/[token]/page.tsx` (both the cancelled-state and — n/a — normal-state CTAs), `EditOrderModal.tsx`: all three now use `var(--color-teal)` fill / `var(--color-cream)` text with `WhatsappLogo` (Phosphor) as the glyph. WhatsApp green (`#25D366`) no longer used as a fill anywhere.
- [x] **De-escalate dietary section** — `confirm/[token]/page.tsx`: border/background moved from danger-red to `var(--color-warning)`/`var(--color-warning-light)`, heading sentence-cased with a leading `Info` icon, `AllergenPill` no longer solid-red-fill-with-white-text (now surface bg + warning text/border, ~5.1:1 contrast).
- [x] **One Voice cleanup, /confirm & /track** — Total price on `/confirm` recolored teal → ink (bold, mono). `/track` stepper reduced to a single teal fill (current-step marker only); completed steps use teal-wash + checkmark, matching the existing "Now" badge treatment.
- [x] **Duplicate footers** — removed the local footer block on `/confirm`'s main confirmable-order view (page relies on the global `Footer`, confirmed its WhatsApp link is functionally equivalent via `whatsappUrlNoText`). Also removed the same redundant local WhatsApp link from the price-pending state for consistency. Left the `StatusPage` (cancelled/already-confirmed) local link in place — its message explicitly instructs "contact us," so the inline CTA is contextually justified there rather than a true duplicate.

**Verification:** `npx tsc --noEmit` clean across all touched files. Not yet re-run through `/impeccable critique`.

**Done when:** a screenshot of any of the three routes is recognizably ZMade, and the last interactive element in every flow is teal.

---

## Phase 5 — Polish & Engineering (`/impeccable polish`)

Visual seams:
- [x] **/track ledger** — `TrackRow` rewritten from a disabled `<Input>` to a plain label/value row matching `/confirm`'s `SummaryRow` pattern. `Total` and `Balance Due` given an `emphasize` prop (bold, larger, full ink) so money rows outweigh metadata rows.
- [x] **Contrast bump** — `--color-ink-muted` darkened `#7a7370` → `#6b6461` (~5.53:1 on cream). `DESIGN.md` token/prose (incl. a second stale reference in the Inputs section) updated to match. Follow-up flagged: `app/global-error.tsx:70,100` hardcodes the old hex inline rather than via the CSS variable — not fixed (outside this pass's file scope).
- [x] **Skeletons match pages** — `track/[token]/loading.tsx` now shows a horizontal stepper skeleton; `confirm/[token]/loading.tsx` got the missing teal-wash hero block; both now render the real `Navbar` instead of a centered wordmark. Follow-up flagged: `confirm/[token]/error.tsx` and `track/[token]/error.tsx` have the same centered-wordmark-vs-Navbar mismatch, not yet fixed (same shape, needs a `Navbar` swap).
- [x] **Mono/format review step** — Step 4 now runs `event_date` through `formatDate`; date and phone rows both render in `var(--font-mono)` via a new `mono` prop on the local `SummaryRow`.
- [x] **Icon library unification** — `ReferencePhotoUpload.tsx` now imports `Plus`/`Image`/`X` from `@phosphor-icons/react`, matching `CustomerPhotoUpload.tsx`.
- [x] **`text-[10px]` floor** — both instances bumped to `text-xs` (12px).
- [x] **`title=` tooltips on touch** — dropped rather than surfaced; for *done* steps the sublabel described a since-passed milestone the checkmark + teal fill already communicate, and showing it under every done column would add uneven per-step height on the mobile stepper.

Engineering:
- [x] **Type the token boundary** — `as any` removed from all three sites; now `as unknown as Inquiry`/`Order` (matching the codebase's existing cast idiom) or dropped entirely where inference already worked. Fixing the real types surfaced and fixed 3 latent bugs the casts had been hiding in `track/[token]/page.tsx` (unsafe `formatDate`/`formatKWD` args, a dead comparison).
- [x] **`getMinDate` UTC bug** — now builds `YYYY-MM-DD` from local `getFullYear`/`getMonth`/`getDate` instead of round-tripping through `toISOString()`.
- [x] **Rename `phoneRow`** — renamed to `minLeadDaysRow` in `app/order/page.tsx`.
- [x] **Dedupe `business_settings` reads** — new `lib/supabase/business-settings.ts` exports a React `cache()`-wrapped `getBusinessContactSettings`, used in `layout.tsx`, `confirm/[token]/page.tsx`, `track/[token]/page.tsx`, `order/success/page.tsx`. Confirmed via `node_modules/next/dist/docs` that `"use cache"` isn't enabled in this install (`cacheComponents` off), so `cache()` is the correct dedupe primitive here. Follow-up flagged: `app/not-found.tsx` and `app/invoice/[token]/page.tsx` have the same duplicated query, not yet migrated to the helper.
- [x] **PhoneInput keyboard support** — rebuilt as a WAI-ARIA "select-only combobox" (arrow/Home/End navigation, typeahead, `aria-activedescendant`, proper `focus-visible` rings replacing the old inline-style mutation) rather than a native `<select>`, since the trigger's two-tone flag/code rendering couldn't survive that swap. External prop API unchanged; no call-site updates needed.
- [x] **`suppressHydrationWarning`** — kept on both `<html>` and `<body>` (already as scoped as it can be — the attribute doesn't cascade). No app-caused theme/dark-mode logic found; it's defensive against browser-extension DOM injection (Grammarly, Dark Reader, password managers). One-line comment added explaining why.
- [x] **DESIGN.md erratum** — fixed the "Do" list's bezier value to `cubic-bezier(0.25, 1, 0.5, 1)` (matching `lib/motion.ts` and `globals.css`'s actual `--ease-out-quart`), with a pointer to both so doc and code can't drift again.

**Done when:** re-run `/impeccable critique` — target ≥ 32/40 with zero P1s. **Status: all 14 items implemented, `npx tsc --noEmit` clean project-wide. Not yet re-run through `/impeccable critique`.** Three small follow-ups flagged above (error.tsx Navbar swap, global-error.tsx hardcoded hex, two more business_settings call sites) — none blocking, none touched by this pass to avoid scope creep across the parallel agents.

---

## Phase 5.5 — One Voice Regression + Wizard Density (2026-07-26 re-critique)

Source: re-critique snapshot `.impeccable/critique/2026-07-26T13-20-10Z__app-order-confirm-track-customer-routes.md`, 31/40, 2 P1. User priority: One Voice first, then full scope in one pass.

- [x] **One Voice regression (P1)** — recolor to ink/ghost, keep teal to the CTA + current-step indicator only:
  - `components/public/Navbar.tsx:17` — wordmark `var(--color-teal)` → ink.
  - `app/confirm/[token]/page.tsx:83` — "Review" progress label teal → ink.
  - `app/confirm/[token]/page.tsx:243-247` — `SelectionPill` border/text teal → ink or ghost treatment.
  - `app/confirm/[token]/page.tsx:299` — "Message us" link teal → ink.
  - `app/order/_components/OrderForm.tsx:707` (`SummaryHeader`, used ×4 at lines 592-634) — Edit-link teal → ink or icon-only, so it doesn't compete with the progress ring.
  - Caught during verification (not in the original 5): `ConfirmForm.tsx`'s own "Your Preferences" Edit/Cancel toggle was also teal — same violation, same fix (→ ink-secondary). Grepped every touched file afterward; only remaining `color-teal` hits are the sanctioned ones (CTA buttons, the wizard's current-step ring + completed-step wash, and the out-of-scope "Review & Confirm" eyebrow wash on `/confirm`).
- [x] **Wizard density (P1)** — `OrderForm.tsx`: delivery address (Governorate/Area/Block/Street/House No/Notes/Maps-pin) split into a genuine conditional 6th step ("Delivery Address"), inserted between "When & How" and Review only when `delivery_type === 'delivery'` (pickup orders stay a 5-step wizard). `STEP_LABELS`/`STEP_FIELDS`/`totalSteps`/`reviewStep` are now all derived live from `deliveryType` instead of hardcoded to 5; progress ring, Back/Next, and Review's per-section jump-back all generalize off `totalSteps`/`reviewStep`. Traced the mid-flow delivery↔pickup toggle case by hand — numbering stays consistent since step 5 always renders as whichever branch's content matches the *current* `deliveryType`.
- [x] **Request Changes screen-reader silence (P2)** — `ConfirmForm.tsx`: applied the same focus-move + `aria-live` pattern from `OrderForm.tsx:179-186` to the `requestSent` success swap (ref + `useEffect` moving focus to the "Request Sent" heading, `tabIndex={-1}` + `outline-none`, `aria-live="polite"` on the panel). Simpler than OrderForm's version since ConfirmForm has no `AnimatePresence` exit-animation delay to work around.
- [x] **Photo-upload drift (P2)** — extracted a shared `components/PhotoTile.tsx` (`PhotoThumb` + `AddPhotoTile`, 80px/±12px offset/18px icons/`text-xs` captions as the single source of truth) used by both `ReferencePhotoUpload.tsx` and `CustomerPhotoUpload.tsx`; each kept its own upload/remove business logic (controlled array + `/api/upload/order` vs. self-fetching + `/api/upload/public` DELETE). Fixed a `text-[10px]` floor violation in `CustomerPhotoUpload.tsx` as a side effect of reuse.
- [x] **Wizard history (P3)** — read the Next 16.2 App Router docs (`node_modules/next/dist/docs/01-app/.../04-linking-and-navigating.md`, "Native History API" section) and used `window.history.pushState`/`replaceState` + a `popstate` listener directly (bypassing `next/navigation`'s router, since this is pure client-side wizard state, not a route change) so OS/browser Back steps the wizard back instead of exiting `/order`. Each step push carries a `?step=N`-tagged entry; popstate reads it back without re-pushing. Accepted gap, flagged deliberately: Back from a *restored* mid-wizard position (sessionStorage draft-restore) leaves `/order` rather than stepping down through synthesized history, since reconstructing a full entry stack on refresh wasn't in scope (sessionStorage already owns state-on-refresh).

**Verification:** `npx tsc --noEmit` clean across all touched files (verified per-agent and again combined). Not yet re-run through `/impeccable critique`, and not yet manually click-tested in a browser (this pass was implemented by four parallel subagents with disjoint file ownership + a combined static/type-check verification — the wizard step logic was traced by hand for the delivery↔pickup mid-flow edge case, but a real browser click-through of the new 6-step delivery path and the Back-button history behavior is still recommended before calling this done).

**Done when:** re-run `/impeccable critique` — target a real score increase (not just a reshuffle) with zero P1s, and confirm by grep that no teal element other than the CTA/current-step indicator remains on `/confirm`, `/track`, or the wizard review step.

---

## Out-of-band fixes (2026-07-26, user-directed, outside the critique cycle)

- [x] **Removed "e.g." placeholder examples** — `OrderForm.tsx` (name, theme, message on cake, special requirements, area/block/street/house-no) and `ConfirmForm.tsx` (message on cake, area). Labels/hints left in place; only the disappearing example text was removed.
- [x] **"Your Name" → "Full Name"** — `OrderForm.tsx:365` — matches the label already used on the `/my-orders` lookup form (`MyOrdersClient.tsx`), since the two need to agree for name-based order lookup to make sense to the customer.
- [x] **`/my-orders` Track Order / View Invoice as buttons** — `MyOrdersClient.tsx`: replaced the two bare text links with `secondary`/`ghost`-styled button-links (Truck/Receipt icons, 44px touch target), matching the existing secondary-button pattern already used for "View Invoice" on `/track`.

---

## Phase 6 — Bilingual UI (separate project, after Phases 1-5)

Prerequisites from earlier phases: `dir="auto"` (Phase 1), font strategy (Phase 2).

- [ ] **i18n framework** — `next-intl` (App Router native). Locale via stored preference / `?lang=` param, NOT locale-prefixed URLs — Zainab's already-sent WhatsApp links must keep working.
- [ ] **String extraction** — ~120-150 strings across the three routes + shared components (Navbar, Footer, ui kit labels, zod error messages).
- [ ] **RTL layout pass** — `dir="rtl"` at `<html>`; audit: stepper connectors, `text-right` summary rows, PhoneInput, chevrons/arrows ("Message us →"), Tailwind `rtl:` variants or logical properties.
- [ ] **Arabic typeface** — Bricolage & Geist have no Arabic. Pair IBM Plex Sans Arabic or Noto Kufi Arabic for display+body; KD amounts stay Latin Geist Mono.
- [ ] **Bilingual data (the invasive piece)** — flavor/size/occasion names come from Supabase in English. Needs `name_ar` columns + admin panel inputs, else the Arabic UI frames English data. Decide early; touches Zainab's workflow.
- [ ] **Locale formatting** — dates via `Intl.DateTimeFormat('ar-KW')`; KD amounts unchanged.

**Estimate:** ~1 week focused; DB/admin columns are the only structural change.

---

## Critique Log

| Date | After phase | Score | P1s | Notes |
|------|-------------|-------|-----|-------|
| 2026-07-25 | baseline | 25/40 | 6 | initial critique |
| 2026-07-25 | Phase 1 | 31/40 | 2 | Trust & Resilience landed; remaining P1s are `/track` disabled-input ledger (Phase 5, unresolved) and One Voice teal overuse (Phase 4, unresolved) |
| 2026-07-25 | Phase 2+3 | 28/40 | 3 | Device/a11y + copy landed and verified; score drop reflects a stricter independent read of pre-existing Phase 4/5 issues (One Voice, WhatsApp green, `/track` ledger), not new regressions. New finding: `ConfirmForm.tsx` has zero draft persistence, unlike `OrderForm.tsx` — not yet in any phase |
| 2026-07-25 | Phase 4+5 | 26/40 | 2 | Brand moments + polish/engineering landed and verified (detector clean, 0 P0). Two P1s carried over, neither scoped by any phase: `ConfirmForm.tsx` still has zero draft persistence against WhatsApp tab eviction; `OrderForm.tsx` `Field`/`Input` pairs never wire `htmlFor`→`id`, so labels aren't bound to controls (confirmed broken; `ConfirmForm.tsx` does this correctly, so it's an OrderForm-only gap). New P2s: One Voice teal diluted by hero-panel wash + ETA callout on /confirm and /track (letter of the rule held, spirit didn't), no confirmation gate on the irreversible Confirm-Order tap, Request-Changes dead-ends with no WhatsApp CTA unlike every other terminal state in the app. Snapshot: `.impeccable/critique/2026-07-25T20-38-49Z__app-order-confirm-track-customer-routes.md` |
| 2026-07-26 | audit+harden+polish (out-of-band) | 31/40 | 3 | `/impeccable audit order` (OrderForm htmlFor/id wiring, 17 fields), `/impeccable harden confirm/[token]` (ConfirmForm sessionStorage draft persistence, token-scoped), and the bundled `/impeccable polish` (teal density → one moment per screen, Confirm-Order reassurance copy, Request-Changes WhatsApp CTA, four hand-rolled buttons consolidated onto `Button`) all landed in one session via parallel subagents; independent cold re-critique confirmed no regressions and both prior P1s closed. Detector clean (0 findings). Three new P1s surfaced by a stricter independent read, none previously scoped: wizard step-advance is silent to screen readers (no focus move / `aria-live`), Step 2 of the order wizard bundles 9+ interdependent decisions in one screen, and Step 4's review has no per-section jump-back to fix a single field. New P2: silent autosave gives no "draft restored" acknowledgment. New P3: four near-duplicate row components (`SummaryRow` ×2, `PreferenceRow`, `TrackRow`) plus inconsistent photo-remove-button colors between `ReferencePhotoUpload`/`CustomerPhotoUpload`. Snapshot: `.impeccable/critique/2026-07-26T12-18-40Z__app-order-confirm-track-customer-routes.md` |
| 2026-07-26 | re-critique (out-of-band) | 31/40 | 2 | Two of the three prior P1s confirmed fixed in code: wizard step-advance now has `aria-live="polite"` + focus-move (`OrderForm.tsx:342`,`179-186`), and Step 4's review now has per-section jump-back via 4× `SummaryHeader` (`OrderForm.tsx:592-634`). But the jump-back fix added 4 simultaneous teal "Edit" links alongside the teal progress ring, and independent code verification found the **One Voice Rule already broken elsewhere it was claimed closed**: `Navbar.tsx:17` wordmark is teal (renders on `/confirm` and `/track`), `confirm/[token]/page.tsx:83` "Review" label teal, lines 243-247 selection-pill border/text teal, line 299 "Message us" link teal — up to 5 teal elements on screen at once. New P1. Wizard density P1 persists (now worst on Step 4's delivery branch, ~10 fields, `OrderForm.tsx:546-581`), third cycle flagging it. New P2s: `ConfirmForm.tsx:273-299` "Request Changes" success has no focus/`aria-live` (screen-reader silent, unlike the now-fixed wizard pattern); `ReferencePhotoUpload.tsx`/`CustomerPhotoUpload.tsx` styling has drifted (thumb size, remove-button offset, icon size, caption scale). P3 carried: wizard step not in browser history. Detector clean (0 findings). User chose: fix One Voice regression first, then full scope (P1+P2+P3) in one pass. Snapshot: `.impeccable/critique/2026-07-26T13-20-10Z__app-order-confirm-track-customer-routes.md` |
