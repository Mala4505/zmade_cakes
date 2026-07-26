---
target: app order confirm track customer routes
total_score: 31
p0_count: 0
p1_count: 3
timestamp: 2026-07-26T12-18-40Z
slug: app-order-confirm-track-customer-routes
---
# Critique — ZMade Cakes customer surface (/order, /confirm/[token], /track/[token])

Re-critique after landing: OrderForm.tsx htmlFor/id wiring, ConfirmForm.tsx draft persistence, and the polish pass (teal density, confirm reassurance copy, Request-Changes WhatsApp CTA, Button consolidation).

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Draft autosave restores silently — no "Draft restored" cue after a tab-eviction recovery. |
| 2 | Match System / Real World | 4 | Kuwait address model, KWD, WhatsApp-first support all match real conventions. |
| 3 | User Control and Freedom | 3 | Step 4 review has no per-section jump-back to fix one field; only sequential Back. |
| 4 | Consistency and Standards | 3 | Four near-duplicate row components (SummaryRow ×2, PreferenceRow, TrackRow); two photo-remove buttons use different colors for the same action. |
| 5 | Error Prevention | 3 | Strong validation; generic fallback copy on non-field server errors. |
| 6 | Recognition Rather Than Recall | 3 | Step labels + read-only ConfirmForm summary reduce recall well. |
| 7 | Flexibility and Efficiency | 2 | Appropriately spartan for a once-or-twice page; no efficiency features, which caps the score by design. |
| 8 | Aesthetic and Minimalist Design | 4 | Strongest heuristic — disciplined restraint, One Voice Rule genuinely code-enforced across all three screens. |
| 9 | Error Recovery | 3 | Step-jump-and-focus on server field errors is well engineered; docked for silent draft recovery. |
| 10 | Help and Documentation | 3 | No FAQ, but WhatsApp-as-support is the right model for this brand; good micro-hints elsewhere. |
| **Total** | | **31/40** | **Polished, two structural gaps remain** |

## Anti-Patterns Verdict

**Does this look AI-generated? No — LOW risk.** No gradient text, no glassmorphism, no side-stripe borders, no cold SaaS-cream palette. The One Voice Rule (teal fires once per screen) is code-enforced, not aspirational — verified across the wizard stepper, the Confirm button, and the track stepper independently.

**Deterministic scan**: `npx impeccable detect --json app/order app/confirm app/track` — zero findings, exit code 0.

**Browser visualization**: not available in this environment (no browser-automation tool present this session) — code-only critique.

## Overall Impression

Score moved 26 → 31 since the last run. The three items fixed this pass (OrderForm accessibility wiring, ConfirmForm draft persistence, and the polish bundle) closed exactly the gaps the last critique flagged, with no regressions found. What's left is no longer about repairing recent damage — it's two structural gaps that predate this pass: Step 2 of the order wizard bundles too many decisions for the brand's "unhurried, considered" promise, and the review screen has no way to jump back to fix a single field.

## What's Working

1. **The One Voice Rule holds under scrutiny** — teal-as-solid-fill appears exactly once per screen across all three routes, verified independently by a cold reviewer with no knowledge of the work that just landed.
2. **Draft recovery targets a real, specific failure mode** — both OrderForm and ConfirmForm persist to sessionStorage on a 400ms debounce specifically because WhatsApp's in-app browser evicts tabs.
3. **Server-error-to-step-jump behavior** — when the server rejects a field on a hidden step, the wizard navigates there and focuses it automatically; most multi-step forms just dump a generic error.

## Priority Issues

**[P1] Screen-reader users get no signal when a wizard step advances.**
**Why it matters**: `advanceStep()` in OrderForm.tsx has no focus management and no `aria-live` region. A VoiceOver/TalkBack user tapping "Next" hears nothing; focus stays on the button with no indication the screen changed. WCAG 4.1.3 (Status Messages) gap.
**Fix**: Move focus to the new step's heading on change, or add a visually-hidden `aria-live="polite"` region announcing "Step N of 4: [label]".

**[P1] Order wizard Step 2 bundles 9+ interdependent decisions into one screen.**
**Why it matters**: Flavor, size, occasion, cake type, conditional theme, message, special requirements, reference photos, and 4 dietary checkboxes all live on one continuous scroll — directly undercutting PRODUCT.md's "customer is a moment... unhurried, considered" principle.
**Fix**: Split into "Cake Basics" and "Details" — a 5-step wizard instead of 4, still linear.

**[P1] No way to jump back to a specific step from the review screen.**
**Why it matters**: Step 4's summary rows are plain read-only text; fixing one field means tapping Back repeatedly through the whole wizard. The step-jump machinery already exists internally (used for server-error routing) but isn't exposed as a manual action.
**Fix**: Make each review section's header tappable, reusing the existing setStep/setDirection pair.

**[P2] Silent autosave gives no acknowledgment.**
**Why it matters**: Both forms restore a draft on mount with zero UI cue. A returning user after an interruption can't tell whether their answers survived, undercutting trust in the very recovery mechanism built for them.
**Fix**: Show a brief "Draft restored" note when the recovery branch fires.

**[P3] Duplicate row components and inconsistent remove-button colors.**
**Why it matters**: SummaryRow (×2), PreferenceRow, and TrackRow independently reimplement the same label/value pattern. ReferencePhotoUpload's remove button uses `rgba(0,0,0,0.6)` while CustomerPhotoUpload's uses `var(--color-danger)` for the identical action.
**Fix**: Consolidate into one shared `DetailRow` component; unify the two photo-upload widgets' remove-button styling.

## Persona Red Flags

**Distracted mobile user, interrupted mid-task**: Reopening the link correctly restores their step and answers, but nothing on screen confirms this happened — a distracted user may not trust their already-entered choices are real and re-verify everything out of doubt. If a photo upload was mid-flight when the tab was evicted, it silently never made it into the saved state, with no error shown.

**Accessibility-dependent screen-reader user**: Individual controls are well-built (RadioGroup has real ARIA roles and roving tabindex, photo-remove buttons are properly labeled), but sequencing breaks down — the wizard's step-advance is silent to VoiceOver, the progress circles have no `role="progressbar"` or per-circle label, and ConfirmForm's Edit/Cancel disclosure toggle has no `aria-expanded`. Well-served field-by-field, loses the thread at every state transition.

## Minor Observations

- DESIGN.md names Cabinet Grotesk as the primary customer-heading face with Bricolage Grotesque as fallback; `app/layout.tsx` only ever loads Bricolage Grotesque — not broken, but the fallback is the only face that ships.
- `order/success/page.tsx` links to "View your orders →" for a flow with no account creation — mildly overpromises against PRODUCT.md's "no account, no app to install" positioning.
- `track/page.tsx` types `finishedImages` as `any[]` — a minor code-quality lapse.

## Questions to Consider

- Is Step 2 paced like a boutique consultation, or does it just look like one while functioning like a long-form intake sheet?
- The codebase clearly anticipated WhatsApp evicting the tab — why was the fix scoped to silent data preservation only, and not the one-line UI acknowledgment that would let an anxious customer trust the recovery happened?
