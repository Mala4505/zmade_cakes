---
target: customer routes /order /confirm /track
total_score: 26
p0_count: 0
p1_count: 2
timestamp: 2026-07-25T20-38-49Z
slug: app-order-confirm-track-customer-routes
---
# Critique — ZMade Cakes customer surface (/order, /confirm/[token], /track/[token])

Re-critique after Phase 4 (Brand Moments) and Phase 5 (Polish & Engineering).

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Skeletons mirror real layout, submit shows a processing state. Photo removal on `CustomerPhotoUpload` only dims opacity, no spinner. |
| 2 | Match System / Real World | 3 | Kuwait address model, KWD, WAMD are all handled correctly. "WAMD" itself is still unexplained as a term outside the one gloss line. |
| 3 | User Control and Freedom | 2 | Wizard back works, Request Changes exists as an escape hatch — but Confirm Order is a one-shot irreversible tap, and Request Changes dead-ends with no next step once sent. |
| 4 | Consistency and Standards | 3 | Strong token discipline (mono money, unified icon set). Undercut by four hand-rolled buttons duplicating `Button`'s visual contract, and two independently built photo-upload widgets for the same job. |
| 5 | Error Prevention | 3 | Zod validation, blackout-date + lead-time checks, maxLength enforcement. No confirmation gate at the single highest-stakes action. |
| 6 | Recognition Rather Than Recall | 3 | Full review screen before submit; ConfirmForm defaults to a read-only summary. |
| 7 | Flexibility and Efficiency | 2 | Appropriately spartan for a once-or-twice-ever page — no efficiency features exist, which is correct for this register but caps the score. |
| 8 | Aesthetic and Minimalist Design | 3 | Genuinely warm and restrained. Diluted by teal appearing more than once per screen on `/confirm` and `/track` (see One Voice finding below). |
| 9 | Error Recovery | 2 | Solid `error.tsx` boundaries with retry everywhere. But `ConfirmForm` has zero resilience to WhatsApp tab-eviction, unlike `OrderForm`, and the Request-Sent state offers no recovery path. |
| 10 | Help and Documentation | 2 | Good micro-hints (Maps pin instructions, char limits). No in-context help for jargon ("WAMD") or blacked-out dates beyond a bare validation string. |
| **Total** | | **26/40** | **Solid, below "polished"** |

## Anti-Patterns Verdict

**Does this look AI-generated? No.** Clean on every classic tell: no gradient text, no glassmorphism, no hero-metric template, no side-stripe borders, no cold SaaS-cream palette. The flat-by-default rule is respected everywhere. The repeated card pattern across `/order`, `/confirm`, and `/track` doesn't read as templated because the content inside each card differs meaningfully section to section.

**LLM assessment**: Two things quietly undercut the "handcrafted atelier" story. First, `DESIGN.md`'s own north star names Cabinet Grotesk as the differentiator for customer headings — the shipped app never loads it (`app/layout.tsx`, `app/globals.css:36`); Bricolage Grotesque, nominally the fallback, is the only face customers ever see. Second, four separate call sites (`ConfirmForm.tsx`, `EditOrderModal.tsx`, `order/success/page.tsx`, `track/[token]/page.tsx`) hand-roll a button that duplicates `Button`'s teal-fill contract from scratch rather than composing it — currently harmless, but exactly the kind of parallel implementation that drifts across sessions.

**Deterministic scan**: `npx impeccable detect --json` against `app/order`, `app/confirm`, `app/track` returned zero findings, exit code 0. No AI-slop tells, no general design-quality regex hits in the reviewed markup.

**Browser visualization**: not available in this environment (no browser-automation tool present this session) — this critique is code-only. If you have a moment to open the three routes on a phone, particularly the WhatsApp in-app browser, it's worth a manual look at the teal-density issue below, since that's a visual judgment call a static read can only approximate.

## Overall Impression

Phase 4 and 5 landed real, visible improvements — the editorial /order register, the recolored peak-end CTAs, the de-escalated allergen section, the /track ledger rewrite are all genuinely good and match the brief. But this is a stricter, independent read, not a continuation of the same reviewer's mental model, and it surfaced two real gaps that neither phase's checklist covered: `ConfirmForm` has no draft persistence against WhatsApp tab eviction (the exact failure mode Phase 1 fixed on `OrderForm`), and `OrderForm`'s `Field`/`Input` pairs never wire `htmlFor` to an `id`, so labels aren't programmatically associated with their controls — a straightforward WCAG failure on the route with the most form fields. The single biggest opportunity is closing those two, since they sit precisely on the highest-stakes screen (confirm) and the longest screen (order).

## What's Working

1. **The /order stepper** — teal ring for current, teal-wash + check for done, neutral connectors — is restrained and legible. It communicates state without competing with the primary CTA, exactly the "quiet confidence" principle in `PRODUCT.md`.
2. **PhoneInput** is a properly built ARIA combobox: roving `aria-activedescendant`, arrow/Home/End navigation, typeahead, focus return on selection. Meaningfully better than the native-select it replaced.
3. **OrderForm's draft resilience** — `sessionStorage` persistence keyed specifically against WhatsApp's in-app-browser tab eviction — is exactly the domain-specific empathy the brief asks for. It's precisely why its absence on `ConfirmForm` reads as a real gap rather than something to shrug off.

## Priority Issues

**[P1] ConfirmForm has no draft resilience; OrderForm does.**
**Why it matters**: `ConfirmForm.tsx` keeps pickup time, message, special requirements, delivery address, and customer comments purely in React state. If WhatsApp's in-app browser evicts the tab mid-edit — the failure mode `OrderForm.tsx` was explicitly hardened against — everything the customer typed vanishes silently, on the one screen where they're about to commit to a price.
**Fix**: Persist ConfirmForm's editable fields to `sessionStorage` keyed by token, mirroring OrderForm's existing draft-key pattern.
**Suggested command**: `/impeccable harden confirm/[token] — extend the OrderForm draft-persistence pattern to ConfirmForm`

**[P1] Broken label/input association across OrderForm.**
**Why it matters**: Every `<Field label="...">` in `OrderForm.tsx` (verified: lines 317-517, e.g. Name, Phone, Flavor, Cake Size, Event Date, all address fields) wraps an Input/Select/Textarea without passing `htmlFor` to `Field` or a matching `id` to the control. `Field.tsx` renders `<label htmlFor={htmlFor}>` — with `htmlFor` undefined, the label has no `for` attribute, so a screen reader can't bind the label to its control. Confirmed this is not how the rest of the app works: `ConfirmForm.tsx` wires `htmlFor`/`id` correctly on every field (e.g. `confirm-pickup-time`, `confirm-area`). This directly contradicts `PRODUCT.md`'s "WCAG AA minimum" commitment, on the route with the most form fields in the product.
**Fix**: Add `htmlFor` + matching `id` on every Field/control pair in `OrderForm.tsx`.
**Suggested command**: `/impeccable audit order — accessibility pass on Field/Input id wiring`

**[P2] One Voice rule satisfied by the letter, not the spirit.**
**Why it matters**: On `/confirm`, the "Your Bespoke Order" hero panel (`page.tsx:111-114`) fills a large block with `--color-teal-light` and colors its own eyebrow label `--color-teal-deep`, while `ConfirmForm`'s Confirm button is a solid `--color-teal` fill — two teal-toned focal points on the highest-stakes screen in the product. On `/track`, the current-step circle (solid teal), the "Now" pill (teal-wash), and the ETA callout (teal-wash bg+border, `page.tsx:268-269`) are three teal signals on one screen. Technically only one pure `#006860` fill exists per screen, so the letter of the rule holds — but the rarity-equals-authority effect the rule protects is diluted.
**Fix**: Pick one teal moment per screen; drop the hero panel and ETA callout to neutral/surface-raised treatments.
**Suggested command**: `/impeccable quieter confirm/[token] and track/[token] — teal density`

**[P2] No gate at the point of highest financial commitment.**
**Why it matters**: "Confirm Order" fires immediately with no recap or double-check of the total and no visible undo path from these routes afterward. For a page explicitly framed as "review before you commit," a single irreversible tap sits exactly where stakes peak.
**Fix**: A lightweight confirm-the-total step, or explicit reassurance copy after the tap that changes are still possible via WhatsApp.
**Suggested command**: `/impeccable clarify confirm/[token] — post-confirm reassurance copy`

**[P2] Request-Changes dead-end.**
**Why it matters**: The `requestSent` state in `ConfirmForm.tsx` is a static panel with no next action — no WhatsApp link, no way back to editing. This is inconsistent with `/order/success` and `/track`'s cancelled state, both of which correctly close with a WhatsApp CTA.
**Fix**: Add the same WhatsApp CTA used elsewhere in the app to the request-sent state.
**Suggested command**: `/impeccable harden confirm/[token] — request-sent state`

**[P3] Button-primitive drift.**
**Why it matters**: Raw hand-styled buttons duplicate `Button`'s visual contract in four places (`ConfirmForm.tsx`, `EditOrderModal.tsx`, `order/success/page.tsx`, `track/[token]/page.tsx`). Harmless today since each copy matches, but it's the kind of parallel implementation that silently drifts.
**Fix**: Replace the four hand-rolled buttons with `<Button>`.
**Suggested command**: `/impeccable extract customer routes — consolidate primary CTA buttons onto Button`

## Persona Red Flags

**Casey (Distracted Mobile User)**: Casey opens the confirm link on the bus, starts editing the delivery address, gets a call, and returns to find WhatsApp killed the tab — `ConfirmForm` has no draft persistence, so the address is gone and Casey has to retype it from memory. On `/order`, Casey is fine: the same interruption is fully recovered by the existing autosave.

**Sam (Accessibility-Dependent User)**: Sam tabs through `/order` with a screen reader. Every field announces only as an unlabeled input — "Name" is never associated with its text box, so Sam hears "edit text" with no context for eight fields in a row. Sam has no such trouble on `/confirm`, which is correctly wired throughout — the inconsistency itself is disorienting once Sam learns the app can do better.

**Riley (Deliberate Stress Tester)**: Riley fills out `/confirm`'s Request Changes with a real complaint, submits, and lands on a dead screen with nothing to do next — no confirmation of what happens now, no WhatsApp fallback, no way back. Riley also notices the Confirm Order button has no "are you sure" step despite the page's own framing as a review-before-committing screen, and taps it by accident testing tab order — there's no way to undo from here.

## Minor Observations

- Two independently built photo-upload widgets (`ReferencePhotoUpload.tsx`, 72px tiles, `/api/upload/order`; `CustomerPhotoUpload.tsx`, 80px tiles, `/api/upload/public`) do the same job on twin brand-moment screens with subtly different sizing.
- `Navbar` on all three routes links to `/my-orders`, a route implying "your orders" on a product with no login — out of scope here, but worth a quick check that it doesn't dead-end or mislead a customer who taps it.
- `formatTime` (`lib/format.ts:12-19`) silently returns `'—'` on malformed input with no customer-visible explanation. Low risk given controlled input, but a silent failure mode.
- The "Now" badge plus the teal step label directly above it on `/track` are a slightly redundant double-signal for the same state.

## Questions to Consider

- If the trust/resilience pass was scoped to fix WhatsApp-tab-eviction data loss, why does the fix live only on `/order` and not `/confirm` — the screen where losing an edited delivery address is arguably costlier?
- Does a full-panel teal-wash hero header count as competing for "the one teal moment," even though it's technically a wash and not the pure fill the rule polices?
- Is "Confirm Order" meant to be truly irreversible from the customer's side, or is the WhatsApp fallback assumed to cover it — and if the latter, should the copy say so explicitly?
