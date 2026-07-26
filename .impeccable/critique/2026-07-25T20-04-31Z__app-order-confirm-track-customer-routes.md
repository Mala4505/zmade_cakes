---
target: customer routes /order /confirm /track
total_score: 28
p0_count: 0
p1_count: 3
timestamp: 2026-07-25T20-04-31Z
slug: app-order-confirm-track-customer-routes
---
# Critique — ZMade Cakes customer surface (/order, /confirm/[token], /track/[token])

Re-critique after Phase 2 (Device & Accessibility) and Phase 3 (Copy).

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Loading/uploading/submitting states solid; draft restore on `/order` is silent (no "we restored your draft" toast) |
| 2 | Match System / Real World | 4 | Phase 3 landed cleanly: WAMD explained, realistic Kuwaiti placeholders, unified "Raw sugar (no refined sugar)" label |
| 3 | User Control and Freedom | 3 | Good edit/cancel/back flows on `/order`; `ConfirmForm.tsx` has zero draft persistence — a killed tab mid-address-edit loses everything, unlike `/order`'s protected wizard |
| 4 | Consistency and Standards | 1 (-2) | One Voice Rule violated structurally, not incidentally: `OrderForm.tsx`'s stepper fills up to 4 circles + 3 connectors teal simultaneously on step 4, `Navbar.tsx:17`'s wordmark is a permanent decorative teal use DESIGN.md explicitly bans, WhatsApp-green `#25D366` fills three separate CTAs, and the two photo-upload widgets use different icon libraries (`lucide-react` vs `@phosphor-icons/react`) |
| 5 | Error Prevention | 3 | Unchanged — blackout dates, lead-time min, unpriced/empty-request guards all present and verified working |
| 6 | Recognition Rather Than Recall | 2 (-2) | `/track`'s `TrackRow` still renders every read-only value as a `disabled <input>` — looks editable, isn't; scored harder this pass because it's the page customers revisit most |
| 7 | Flexibility and Efficiency | 3 | Keyboard-navigable RadioGroup; sessionStorage draft covers `/order` only, not `/confirm` |
| 8 | Aesthetic and Minimalist Design | 2 (-1) | Undercut by the red "alarm" dietary section and the duplicate stacked WhatsApp footer on `/confirm`, both verified still present |
| 9 | Error Recovery | 4 (+1) | Server-error step-jump (`OrderForm.tsx:192-208`) verified working end-to-end: sets field errors, computes earliest affected step, auto-focuses after the transition — genuinely excellent |
| 10 | Help and Documentation | 3 (+1) | Maps-pin how-to, new "what happens next" line before submit, WhatsApp escape hatch on every route |
| **Total** | | **28/40** | **Acceptable — Phase 2/3 measurably improved match-to-real-world and error recovery, but this pass's independent review weighted the still-open consistency/recognition failures more heavily than the last one did. Both scores are honest; they're not directly comparable heuristic-by-heuristic.** |

## Anti-Patterns Verdict

**LLM assessment**: No slop tells — no gradient text, glassmorphism, hero-metric layout, or generic AI palette. The problems here are brand-discipline and consistency failures on a deliberately-designed system, not template-generation smells.

**Deterministic scan**: `npx impeccable detect --json app/order app/confirm app/track` → **0 findings**, exit 0 (unchanged from both prior runs). As before, the detector doesn't reach semantic issues like One Voice violations or the disabled-input ledger — those are LLM-review-only findings.

## Overall Impression

Phase 2 and 3 did what they were scoped for: `/track`'s copy is warmer, addresses use real examples, WAMD is explained, and the accessibility mechanics (16px inputs, visible focus ring, 44px targets, multi-photo upload with removal, `next/image`) all landed and were spot-checked as genuinely present, not just claimed. Heuristics 2, 9, and 10 moved up.

But this run's independent reviewer looked harder at the consistency and recognition failures that were previously folded into softer 3/4 scores, and verification confirmed every specific claim: the `/order` stepper really does fill 4 circles and 3 connectors teal at once on the review step, the Navbar wordmark really is a permanent teal use, WhatsApp green really appears on three separate CTAs, `/track` really still wraps read-only data in disabled inputs, and `ConfirmForm` really has no draft persistence at all (a real gap `OrderForm` doesn't have). None of this is new damage from Phase 2/3 — it's pre-existing Phase 4/5 scope that a more careful pass caught more precisely this time. **The total moving 31 → 28 is not a regression; it's a stricter, better-verified read of problems that were always there**, several already logged as Phase 4/5 targets.

## What's Working

1. **Server-error step-jump** (`OrderForm.tsx:192-208`) — verified: sets RHF errors, computes the earliest step containing an errored field via `STEP_FIELDS`, transitions there, and auto-focuses 200ms later. This is a genuinely well-built recovery pattern, rare to see done this precisely.
2. **Phase 3 copy is now consistent across surfaces** — "Raw sugar (no refined sugar)" reads identically in `OrderForm.tsx`'s checkbox, its Step 4 summary, and `confirm/page.tsx`'s pill; no more label drift between the three places a customer sees the same fact.
3. **44px touch targets via hit-area expansion, not visual bloat** (`ConfirmForm.tsx:211-228`, `EditOrderModal.tsx:29-37`) — `min-h-11 px-2 -mx-2 -my-2` grows the tappable area without growing the glyph, which is the correct fix, not the lazy one.

## Priority Issues

- **[P1] One Voice Rule is structurally broken, not incidentally.** Verified in `OrderForm.tsx:239-251`: on step 4, `s <= step` fills every completed-and-current circle teal and `s < step` fills every prior connector teal — 4 circles + 3 bars, all teal, at once. Add the permanent teal `Navbar` wordmark (`Navbar.tsx:17`) and `/track`'s multi-teal status circles, and teal has stopped meaning "the one important thing" anywhere on these routes. *(Already Phase 4 scope — the stepper redesign needs to be explicit about this, not just "fix the price color.")*

- **[P1] WhatsApp green competes with the brand at the three highest-emotion moments.** `#25D366` fills the order-success CTA (`order/success/page.tsx:37`), the cancelled-order CTA (`track/page.tsx:116`), and `EditOrderModal`'s primary action (`EditOrderModal.tsx:60`) — verified present in all three. These are exactly the peak-end moments (just submitted, order cancelled, escalating a change) that should carry ZMade's own color. *(Phase 4 scope, already noted at baseline — still open.)*

- **[P1] `/track` still renders read-only order data as disabled form inputs.** `TrackRow` (`track/page.tsx:397-419`) unchanged since baseline. This is the page a customer opens repeatedly to check status — every visit currently looks like a form that doesn't work. *(Phase 5 scope, unresolved across three critique runs now — worth pulling forward given how consistently it's flagged.)*

- **[P2] `ConfirmForm` has no draft persistence at all.** New-to-this-pass finding: `OrderForm.tsx` got sessionStorage autosave in Phase 1, but `ConfirmForm.tsx` — where a customer edits pickup time, message, special requirements, and a full delivery address — has none (verified: zero `sessionStorage` references in the file). A WhatsApp tab eviction mid-edit on `/confirm` loses everything, the exact failure mode Phase 1 was supposed to close everywhere. *(Not in any phase yet — should be added, likely as a Phase 1 follow-up or pulled into Phase 4/5.)*

- **[P2] Duplicate WhatsApp footer on `/confirm`, verified.** The page's own `<footer>` ("Need to make a change? Message us on WhatsApp before confirming," `confirm/page.tsx:243-258`) sits directly above the global `Footer` (`layout.tsx:61`), which also renders a "Message us on WhatsApp" link. Two near-identical links stacked at the bottom of the highest-stakes page. *(Already Phase 4 scope — quick fix, keep one.)*

- **[P3] Dietary section still styled as an error/alarm state.** `confirm/page.tsx:176-203` — red border, red-tinted background, solid-red pill fills for benign preferences like "Nut-free." *(Phase 4 scope, unresolved.)*

## Persona Red Flags

**Kuwaiti customer, Android, WhatsApp in-app browser**: `/order`'s draft-restore protects the intake wizard, but editing a delivery address on `/confirm` has zero equivalent protection — a tab eviction mid-edit silently discards everything typed, with no warning either before or after.

**First-time customer at `/confirm`**: the red dietary banner and the duplicate WhatsApp footer both sit right around the confirm CTA — precisely the moment DESIGN.md wants "unhurried and reassuring," and instead it reads mildly alarmed (the red box) and mildly broken (the doubled footer).

**Zainab, reviewing before she sends a link**: the green WhatsApp buttons sitting next to her own teal-branded pages are the kind of inconsistency a brand-conscious owner notices on sight; so is `/track` — the page she'd expect customers to open most often — still looking like an unfinished government form.

## Minor Observations

- Icon libraries mixed, verified: `ReferencePhotoUpload.tsx:4` imports from `lucide-react`; its near-twin `CustomerPhotoUpload.tsx:4` imports from `@phosphor-icons/react` — visibly different glyph geometry between two nearly-identical upload widgets.
- `CustomerPhotoUpload.tsx`'s new 44px remove-button hit area (`top:-12, right:-12`) overlaps slightly into the neighboring thumbnail and sets no `zIndex`, unlike `ReferencePhotoUpload.tsx` — a small tap-precision risk, not a blocker.
- `as any` casts persist at Supabase read boundaries (`confirm/page.tsx:39,58`, `track/page.tsx:57,70,242`) — expected, Phase 5 not started.
- Cabinet Grotesk still never loads; `--font-display` resolves straight to the Bricolage Grotesque fallback (`layout.tsx:21-26`, `globals.css:36`) — carried from the last critique, still no phase owns it.
