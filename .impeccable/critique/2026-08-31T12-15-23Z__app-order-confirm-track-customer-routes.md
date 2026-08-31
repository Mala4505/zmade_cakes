---
target: app order confirm track customer routes
total_score: 33
p0_count: 0
p1_count: 2
timestamp: 2026-08-31T12-15-23Z
slug: app-order-confirm-track-customer-routes
---
# Critique — ZMade Cakes customer surface (/confirm/[token], /track/[token], /inquire)

Re-critique after ACTION-PLAN-mobile-feedback.md Phases 1, 3, 4, and 5 (mobile responsiveness, input/touch-target primitives, phone parsing/contact visibility, and today's breakpoint unification + Modal bottom-sheet + hover-affordance polish). Two independent assessments, neither saw the other's output during their own review; synthesized here. Compared against the prior snapshot (`2026-07-26T13-20-10Z`, 31/40, 2 P1) only in this synthesis step, not by either assessing agent.

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 4 | Full-screen `CakeLoader` on every high-stakes submit, `aria-live` regions, draft-restore banners, per-photo spinners |
| 2 | Match System / Real World | 4 | Kuwait governorates, plain payment-method naming, first-name greetings |
| 3 | User Control and Freedom | 3 | Wizard back/edit-jump-to-step is excellent; "Remove cake" and photo-remove are irreversible with no undo |
| 4 | Consistency and Standards | 2 | Checkbox's solid-teal selected state vs. RadioGroup's wash-only selected state; confirm-page loading skeleton color doesn't match the live page |
| 5 | Error Prevention | 3 | Strong Zod/RHF validation, blackout-date + lead-time checks; no confirm/undo before destructive removes |
| 6 | Recognition Rather Than Recall | 4 | Review step shows every section with inline Edit; full order recap before Confirm |
| 7 | Flexibility and Efficiency | 3 | Draft persistence, full keyboard nav on RadioGroup |
| 8 | Aesthetic and Minimalist Design | 4 | Flat-by-default respected throughout in-scope routes; no shadow abuse |
| 9 | Error Recovery | 3 | Inline field errors + jump-to-erroring-step; some error copy generic |
| 10 | Help and Documentation | 3 | No formal help, but contextual hints substitute well |
| **Total** | | **33/40** | **Good — solid foundation, address the consistency gaps below** |

## Anti-Patterns Verdict

**Does this look AI-generated? No.**

**LLM assessment**: A genuinely bespoke `CakeLoader` SVG sequence (mixing bowl → pour → tiers rise → frosting → candle) instead of a generic spinner, register-appropriate microcopy, dashed-border dividers instead of solid HR lines, no box-shadows on resting surfaces, no gradient text, no scale-from-0 entries. Unusually disciplined against the DESIGN.md "Don't" list. One documentation drift caught along the way, not a UX defect but worth fixing: DESIGN.md documents Geist + Cabinet Grotesk/Bricolage Grotesque as the type system; the shipped code (`app/globals.css`, `app/layout.tsx`) actually wires Open Sauce Sans + Fraunces. Neither documented family appears anywhere in the repo.

**Deterministic scan**: `npx impeccable detect --json app/confirm app/track app/inquire` — **zero findings**, exit code 0, across all 15 component files in the three route trees (confirmed via per-directory re-run as a sanity check, and via `find` that the right files were scanned). No project-level ignore list is suppressing anything (no `.impeccable/config.json`). This corroborates that the obvious pattern-level anti-patterns (hardcoded off-palette colors, banned shadows, bounce easing, etc.) are absent — but a regex/AST scanner structurally can't catch the cross-component consistency and affordance issues the LLM pass found below, which is exactly the gap the two-assessment method is designed to cover.

**Visual overlays**: not run — no browser automation tool is available in this environment, so this pass is source-only (no live-page visual inspection). Noted as a scope limit, not a finding.

## Overall Impression

This is a well-executed customer surface that clearly took the brand brief seriously — the One Voice Rule, the flat-by-default rule, and the warm-cream base are respected almost everywhere in scope, and the peak moment (Confirm → CakeLoader → "Your cake is in good hands") lands exactly as PRODUCT.md intends. The score moved from 31 to 33 since the last cycle with zero new P0s and the two prior P1s both gone (superseded by new findings below, not carried over). The single biggest opportunity: two sibling selection controls (Checkbox, RadioGroup) speak two different visual dialects for "selected," which is the kind of inconsistency a first-time customer notices even if they can't name it — and it's an easy, contained fix.

## What's Working

1. **Draft-restore across WhatsApp's in-app-browser tab eviction** (`ConfirmForm.tsx:96-165`, `OrderForm.tsx:233-260`) — a real, well-targeted fix for how this app is actually used: opened once, inside WhatsApp, on a phone that gets interrupted.
2. **`CakeLoader`** (`components/ui/CakeLoader.tsx:32-227`) — bespoke, on-brand, and has a genuinely calmer (not just static) `useReducedMotion` variant.
3. **Confirm → Track handoff** (`app/track/[token]/page.tsx:119-126`) — the highest-stakes moment in the app resolves warmly with no confirmation-dialog friction, which is the right call per PRODUCT.md's anti-reference list, since the full order review sitting above the button already functions as the confirmation gate.

## Priority Issues

**[P1] Checkbox and RadioGroup disagree on what "selected" looks like**
- **Why it matters**: `components/ui/Checkbox.tsx:22` gives a checked box a *solid* teal border; `components/ui/RadioGroup.tsx:98-99` gives a selected radio only a teal wash, no teal border. On `/inquire` step 3 a customer can check up to 4 dietary boxes at once, meaning up to 4 full-saturation teal borders on screen simultaneously, next to the always-visible teal "Next" button. Two controls used minutes apart in the same wizard communicate "selected" at different intensities of the app's one accent color — the exact kind of inconsistency the One Voice Rule exists to prevent.
- **Fix**: Drop Checkbox's teal border; match RadioGroup's wash-only vocabulary (`bg-teal-light`, no teal border).
- **Suggested command**: `/impeccable polish`

**[P1] Confirm-page loading skeleton visibly mismatches the live page it's standing in for**
- **Why it matters**: `app/confirm/[token]/loading.tsx:40-46` paints the summary-header skeleton with `var(--color-teal-light)` (the file's own comment calls it "the teal-wash order summary hero"), but the live page renders that header in neutral `var(--color-surface-raised)` (`app/confirm/[token]/page.tsx:146`). On a slow connection — the exact condition a loading skeleton exists for — the customer sees a teal-tinted block flash to neutral a moment later, on the single most brand-critical page in the app, whose own comment promises the shape "must match `page.tsx` exactly."
- **Fix**: Update the skeleton's header background to `var(--color-surface-raised)`.
- **Suggested command**: `/impeccable polish`

**[P2] Today's Modal bottom-sheet drag handle is a false affordance**
- **Why it matters**: `components/ui/Modal.tsx:161-163` renders a drag-handle bar (`aria-hidden="true"`) on the mobile bottom sheet with no `onTouchStart`/pan handler wired anywhere in the file. It visually promises "swipe down to dismiss" on `EditOrderModal` (the one modal in scope on these routes), but only backdrop-tap, Esc, the X button, or the footer buttons actually close it. This is a regression introduced by today's Phase 5 Modal change, not a pre-existing issue — flagging it now, while it's cheap to fix, is exactly what this re-critique pass is for.
- **Fix**: Either wire a real swipe-to-dismiss gesture on the handle, or remove the handle so the sheet doesn't promise an interaction it doesn't have.
- **Suggested command**: `/impeccable harden`

**[P2] Sub-44px Cancel button sits directly beside a correctly-sized button in the same regression-risk modal**
- **Why it matters**: `app/track/[token]/_components/EditOrderModal.tsx:47-54` — the Cancel button (`px-5 py-2.5`, no `min-h-11`) is ≈40px tall, next to the correctly-sized 44px "Continue to WhatsApp" button in the same footer row. Violates PRODUCT.md's stated 44px minimum touch target, and is easy to mis-tap one-handed, which is how this app's customers actually hold their phones.
- **Fix**: Add `min-h-11`, or swap for `<Button variant="secondary" size="md">` to inherit the primitive's sizing.
- **Suggested command**: `/impeccable adapt`

**[P2] Destructive "Remove cake" has no confirmation or undo**
- **Why it matters**: `app/inquire/_components/OrderForm.tsx:618-627` — a mis-tap instantly discards everything filled in for that cake (flavor, size, theme, message, special requirements) with zero recovery path. This sits oddly next to how much care was put into draft persistence in the same file — the wizard protects against losing work to a WhatsApp tab switch, then throws it away on one accidental tap.
- **Fix**: An undo-toast (sonner is already in use elsewhere in this codebase) or a tap-to-confirm inline state.
- **Suggested command**: `/impeccable harden`

## Persona Red Flags

**Casey (Distracted Mobile User)** — this is the app's primary audience: one-handed, on the go, interrupted mid-flow.
- The sub-44px Cancel button next to the 44px WhatsApp button (P2 above) is a real mis-tap risk one-handed.
- The new drag handle (P2 above) invites a swipe gesture that does nothing — Casey will try it and conclude the sheet is stuck, when it isn't.
- Worth calling out as a genuine win for Casey specifically, not a red flag: the WhatsApp-tab-eviction draft-restore is *exactly* Casey's scenario (switches apps, gets interrupted) and it's handled well.

**Jordan (Confused First-Timer)** — every customer on `/confirm` and `/track` is, by construction, a first-timer; they've never used this product before and won't again for months.
- The Checkbox/RadioGroup visual mismatch (P1 above) will read to Jordan as "these mean something different," even without being able to name why.
- `EditOrderModal`'s "Continue to WhatsApp" hands any edit off to freeform chat, including fields `/confirm`'s own form already knows how to edit in-app — a context switch mid-task that a first-timer may find jarring rather than a shortcut.
- Working well for Jordan: the Review step recaps every section before Confirm, and the Confirm page shows the full order before asking for the one committing tap — exactly the reassurance a first-timer needs at a high-stakes moment.

## Minor Observations

- `components/PhotoTile.tsx:46` hardcodes `color: '#fff'` on the remove-icon inside the danger circle — a small, literal instance of the banned "pure white/black" pattern (12px icon, low visual impact, but worth a one-line fix).
- `app/confirm/[token]/page.tsx:121` uses `--color-teal-deep` as a standalone eyebrow-label text color; DESIGN.md documents teal-deep's only role as "hover state for teal fills... never used as a standalone fill" — text usage isn't a literal fill, but it stretches the token's stated purpose.
- Text-color (non-fill) teal shows up as a link color in several places across the three routes — `Footer.tsx:32` ("Message us on WhatsApp," present on every customer page), `EditOrderModal.tsx:34` ("Edit"), `track/[token]/page.tsx:497` ("View receipt," once per payment row), `OrderForm.tsx:721` ("Add another cake"), `inquire/success/page.tsx:47` ("View your orders →"). None break the literal one-*fill*-per-screen rule, but on `/track` with several payments recorded that's 4-6 teal-colored elements visible at once, diluting "its rarity is its authority." Not urgent, but worth a pass if `/impeccable polish` runs on this area anyway.
- `inquire/success/page.tsx:20-22` stacks a large filled teal checkmark directly above a teal-filled WhatsApp button — two saturated-teal shapes in one glance, borderline against the One Voice Rule's spirit.
- `CustomerPhotoUpload.tsx` and `ReferencePhotoUpload.tsx` are two independently-implemented upload widgets sharing only `PhotoTile`; `ReferencePhotoUpload.tsx`'s own comment already flags a drift risk between the two.
- **DESIGN.md's documented type system does not match the shipped fonts** (Geist/Cabinet Grotesk documented vs. Open Sauce Sans/Fraunces shipped). Not a UX defect — Fraunces reads as a tasteful, characterful serif that suits the brand's "editorial bakery" references well — but it will mislead the next design review (human or agent) that trusts the doc over the code. Worth a `/impeccable document` re-run to resync.
- Cognitive load: low overall. One conditional watch item — cake-size `RadioGroup` options (`OrderForm.tsx:650-657`) are seeded from the `size_options` table; if that table ever grows past 4 options, that single decision point crosses the low-cognitive-load threshold this review is otherwise crediting it for.

## Regression Check — Today's Phase 5 Changes

- **Breakpoint unification** (`hidden md:flex` → `hidden lg:flex`): no effect on these routes. The only such conditional reachable here is `components/public/Footer.tsx:18`, gated on `isAdmin`, which is always false on `/confirm`, `/track`, `/inquire`.
- **Modal bottom-sheet change**: no functional breakage in `EditOrderModal.tsx` — the footer's `flex-col-reverse` + full-width-button treatment correctly resolves the "Continue to WhatsApp" wrap bug it was built to fix, and puts the primary action visually on top on mobile. The one real issue it introduced is the false-affordance drag handle (P2 above).
- **Hover-affordance touch fixes**: those two changes (`ImageGallery.tsx`, `FlavorImageUpload.tsx`) are both in the **admin** panel, not these customer routes — out of scope for this critique, correctly not touched here.

## Questions to Consider

- If Fraunces and Open Sauce Sans are the real shipped fonts, should DESIGN.md be regenerated from the current code before the next critique cycle, so future reviews stop grading against a typography system nobody's enforcing?
- Does `/inquire/success` need a WhatsApp CTA button at all, right after the checkmark? Given "ZMade doesn't need to sell, it's already booked," is that asking for one more action the moment the customer just finished the one they came for?
- Is routing every `EditOrderModal` edit through WhatsApp actually lower-friction than letting the customer edit the fields `/confirm`'s own form already knows how to handle?
