---
target: app order confirm track customer routes
total_score: 31
p0_count: 0
p1_count: 2
timestamp: 2026-07-26T13-20-10Z
slug: app-order-confirm-track-customer-routes
---
# Critique — ZMade Cakes customer surface (/order, /confirm/[token], /track/[token])

Independent re-critique, cold read (no prior report consulted by the reviewing agent). Compared against the last snapshot (`2026-07-26T12-18-40Z`, 31/40) only during my own synthesis, not by the assessing agents.

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 4 | Wizard now has `aria-live="polite"` step counter + focus-move to each step heading (`OrderForm.tsx:342`, `179-186`) — the screen-reader-silence P1 from the last run is fixed. |
| 2 | Match System / Real World | 4 | Kuwait address model, WAMD payment named and explained, `dir="auto"` throughout. |
| 3 | User Control and Freedom | 3 | Review step now has per-section jump-back (`SummaryHeader` × 4, `OrderForm.tsx:592-634`) — last run's other P1 is fixed. Docked because wizard step isn't reflected in browser history; OS back exits the flow instead of stepping back. |
| 4 | Consistency and Standards | 2 | **The One Voice Rule — DESIGN.md's own flagship, code-enforced-claimed rule — is broken on every customer route.** See Priority Issue #1. Two near-duplicate photo-upload components have also drifted apart in styling. |
| 5 | Error Prevention | 3 | Zod validation client+server, blackout-date checks. Step 4 with Delivery selected still lets a lot pile up before anything fires. |
| 6 | Recognition Rather Than Recall | 4 | Review step recaps every prior answer via `DetailRow`/`SummaryHeader`; nothing must be remembered. |
| 7 | Flexibility and Efficiency | 3 | Draft auto-save is a genuine win for an interruptible single-session flow; appropriately spartan otherwise. |
| 8 | Aesthetic and Minimalist Design | 2 | The system sells "single accent, fires once per screen" as its defining differentiator. Confirmed by code read: it doesn't hold on any of the three routes. |
| 9 | Error Recovery | 3 | Field-error step-jump-and-focus is well engineered. Docked: `ConfirmForm.tsx`'s "Request Changes" success swap has no focus move or `aria-live` — silent to screen readers, unlike the pattern already solved elsewhere in the same file's sibling flow. |
| 10 | Help and Documentation | 3 | No FAQ, but "Message us on WhatsApp" is the right help model for a no-login product. |
| **Total** | | **31/40** | **Two structural P1s closed, one new P1 opened — flat score, different shape** |

## Anti-Patterns Verdict

**Does this look AI-generated? No — LOW risk.** No gradient text, no glassmorphism, no dark glows, no hero-metric cards, no Inter/system-sans on customer headings. Cabinet Grotesk/Geist Mono pairing, warm cream palette, and copy voice read as deliberately authored. Skeleton loaders mirror exact page geometry; sessionStorage draft-restore is purpose-built for WhatsApp's in-app-browser tab eviction, not boilerplate.

**Deterministic scan**: `npx impeccable detect --json app/order app/confirm app/track` — **zero findings**, exit code 0. Consistent with every prior run; the detector has never caught anything here, and its cleanliness doesn't extend to catching design-system self-consistency (the One Voice Rule is a project-specific rule, not one of its 27 generic patterns).

**Browser visualization**: not available in this environment (no browser-automation tool present this session) — code-only critique, same limitation as the last two runs.

## Overall Impression

The last two P1s (silent step-advance for screen readers, no per-section jump-back on review) are genuinely fixed, verified directly in code — not just claimed. But fixing the jump-back added four teal "Edit" links to the review screen, and independent verification found the One Voice Rule was already quietly broken elsewhere it was claimed closed: the brand wordmark in the shared `Navbar` is teal on both `/confirm` and `/track`, the "Review" progress label on `/confirm` is teal, the occasion/theme/decoration pills are teal-bordered, and a "Message us" link is teal — several of these sit on screen simultaneously with the Confirm button. The net effect: the score holds at 31/40, but it's now the design system's own defining rule that's the biggest gap, not an accessibility or resilience hole. That's a different kind of problem than the last four runs surfaced, and it's the one DESIGN.md would call out as most damaging to brand credibility.

## What's Working

1. **Skeleton loaders mirror real layout geometry exactly** — no perceptible jump on hydration for `/confirm` and `/track`.
2. **Draft-restore engineered specifically for WhatsApp's tab eviction**, on both `/order` and `/confirm` — a real product insight, not generic autosave.
3. **Peak-end design at "Confirm Order"** — reassurance copy directly under the CTA, with "Request Changes" as a visible escape hatch right below it, defusing the highest-stakes tap in the product.

## Priority Issues

**[P1] One Voice Rule is violated on every customer route it's meant to define.**
Why it matters: DESIGN.md states, in bold, that teal appears as a filled/bordered color on at most one element per screen, and frames this as ZMade's core visual differentiator versus "generic SaaS" and "food-delivery" anti-references. Verified in code: `components/public/Navbar.tsx:17` sets the wordmark to `var(--color-teal)`, and this Navbar renders on `/confirm` and `/track`. On `/confirm`, `app/confirm/[token]/page.tsx:83` colors the "Review" progress label teal, lines 243-247 border/color the selection pills teal, and line 299 colors a "Message us" link teal — up to 5 teal elements can be on screen with the Confirm button at once. On the order wizard's review step, `OrderForm.tsx:592-634` renders `SummaryHeader` four times, each with a teal "Edit" link (line 707), simultaneously with the teal progress-stepper ring (lines 322-323) — 5 teal elements on one screen.
Fix: recolor the Navbar wordmark to ink, restyle `SelectionPill`/`AllergenPill` and the "Message us" link as ink/ghost treatments, and give `SummaryHeader`'s Edit affordance a non-teal (icon-only or ink-text) treatment, reserving teal strictly for the single highest-priority CTA plus the current-step progress indicator.
Suggested command: `{{command_prefix}}impeccable bolder` (color-discipline pass) or a direct fix, since this is a well-scoped, code-level correction.

**[P1] Step 4 of the order wizard can present ~10 fields on one screen when Delivery is selected.**
Why it matters: `OrderForm.tsx:546-581` stacks Governorate/Area/Block/Street/House No/Notes/Maps-pin under the date/time/method fields already on the same step. PRODUCT.md's Design Principle #1 calls customer-facing screens "a moment," meant to feel "considered, unhurried" — a 10-field wall contradicts that promise, and this is the third consecutive critique cycle to flag wizard-step density (previously scoped to Step 2's 5 fields; now the delivery branch of Step 4 is denser still).
Fix: split delivery address into its own sub-step, or visually separate it as a distinct card within Step 4 so it doesn't read as one continuous form.
Suggested command: `{{command_prefix}}impeccable layout` or `{{command_prefix}}impeccable distill` (reduce per-screen decision count).

**[P2] "Request Changes" success transition is silent to screen readers.**
Why it matters: `ConfirmForm.tsx:273-299` swaps the entire form for a success message with no focus move and no `aria-live` region — inconsistent with the `focusStepHeading` pattern already solved in `OrderForm.tsx:179-186`. A screen-reader user gets no confirmation their request was sent.
Fix: apply the same focus-move-plus-`aria-live` pattern used on the wizard to this state transition.
Suggested command: `{{command_prefix}}impeccable harden` (accessibility parity with the already-fixed wizard pattern).

**[P2] Two near-duplicate photo-upload components have drifted apart.**
Why it matters: `ReferencePhotoUpload.tsx` (order wizard) and `CustomerPhotoUpload.tsx` (confirm page) share ~90% of their structure but differ in thumbnail size (72px vs 80px), remove-button offset, icon size, and caption scale, with no functional reason — an inconsistency a careful studio wouldn't ship.
Fix: extract a shared `PhotoUploadGrid` component parameterized for the two contexts.
Suggested command: `{{command_prefix}}impeccable audit` or a direct refactor.

**[P3] Wizard step isn't reflected in browser history.**
Why it matters: the OS back gesture exits `/order` entirely instead of stepping back one step; only the sessionStorage draft-restore softens the damage if the user returns.
Fix: push step transitions into history state (or a `?step=` query param) so back navigates within the wizard.

## Persona Red Flags

**Amira (First-Time Customer, confirming via WhatsApp link on an older Android phone)**: Opens `/confirm`, sees teal in the wordmark, the "Review" label, three selection pills, and the Confirm button all in the same viewport — the "single most important action" isn't visually singular, diluting the cue that would otherwise draw her eye straight to Confirm. Low risk of task failure (the button is still the largest teal element), but the calm, considered feel DESIGN.md is built around is undercut.

**Yusuf (Screen-reader user, tracking an order via VoiceOver)**: If he requests changes on `/confirm`, the form silently becomes a success message with no announcement — he has no way to know his request went through short of manually re-exploring the page. The wizard itself, by contrast, now announces step changes correctly — this is the one place the fix wasn't carried over.

## Minor Observations

- `SelectionPill` and `AllergenPill` (`confirm/[token]/page.tsx`) are near-identical local components that could merge into one `Pill` with a color prop.
- `CustomerPhotoUpload.tsx` uses a raw `<img>` for thumbnails while `track/[token]/page.tsx`'s photo gallery uses `next/image` — low visible impact, but inconsistent with the `next/image` migration already done elsewhere.
- Silent autosave restoration (no "draft restored" acknowledgment) flagged in the last run is still unaddressed — not re-verified in depth this cycle, carrying forward as a P3/minor.

## Questions to Consider

- Should the brand wordmark really be exempt from the One Voice Rule, or is that the first thing that should stop being teal?
- The jump-back fix and the aria-live fix both landed clean — but neither pass checked the fix against the system's own color-discipline rule. Worth a standing checklist before any future patch touches these screens?
