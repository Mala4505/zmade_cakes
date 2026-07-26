---
target: customer routes /order /confirm /track
total_score: 25
p0_count: 0
p1_count: 6
timestamp: 2026-07-25T17-02-31Z
slug: app-order-confirm-track-customer-routes
---
# Critique — ZMade Cakes customer surface (/order, /confirm/[token], /track/[token])

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Skeletons/spinners/steppers present, but loading shells mismatch real layouts (centered wordmark vs Navbar; vertical vs horizontal stepper) |
| 2 | Match System / Real World | 3 | Kuwait-native addressing & KD; but "via WAMD" unexplained, raw ISO date on review step, "Raw sugar" ambiguous |
| 3 | User Control and Freedom | 2 | No draft persistence in WhatsApp browser; confirm-page photos can't be removed; cancelled/confirmed StatusPage has zero actions |
| 4 | Consistency and Standards | 2 | Two photo-upload components; /track disabled inputs vs /confirm text rows for same data; WhatsApp green competes with teal as second primary color |
| 5 | Error Prevention | 3 | Per-step zod, date min + blackouts, maxLengths; getMinDate UTC off-by-one at night, no autosave |
| 6 | Recognition Rather Than Recall | 3 | Everything labeled; review step restates all data; strong contextual hints |
| 7 | Flexibility and Efficiency | 2 | One rigid path; single-file photo upload (no `multiple`); English-only for an Arabic-locale audience |
| 8 | Aesthetic and Minimalist Design | 2 | Confirm page composed; /order Step 2 is a 9-decision wall; /track is ~10 disabled inputs of equal weight |
| 9 | Error Recovery | 2 | Server errors set on fields in hidden steps while user sits on Step 4 with a generic message |
| 10 | Help and Documentation | 3 | Best-in-class inline hints; WhatsApp escape on every route; no "what happens next" on /order |
| **Total** | | **25/40** | **Acceptable — significant improvements needed** |

## Anti-Patterns Verdict
Not AI slop. Deterministic detector (canary-verified): **0 findings** across all four target dirs. LLM review concurs: no gradient text, glass, purple, hero metrics, card grids. Considered system with generic patches: stock wizard chrome on /order, mixed icon libraries (lucide in ReferencePhotoUpload.tsx:4, Phosphor elsewhere), raw #25D366/#fff WhatsApp buttons at three points.

## Priority Issues
- **[P1] Invalid/revoked token lands on Next's default 404.** No app/not-found.tsx exists. The unbranded black-on-white 404 with no WhatsApp recourse is the worst possible first paint for "the link is the brand." (Caught in synthesis; both assessments missed it.)
- **[P1] 14px inputs masked by disabling zoom.** components/ui/Input.tsx:10 `text-sm` + PhoneInput 14px, violating DESIGN.md's 16px rule; app/layout.tsx:41 `maximumScale: 1` is a WCAG 1.4.4 failure and iOS ignores it anyway.
- **[P1] Keyboard focus invisible.** globals.css:78-82 outlines in teal-light #e6f5f4 on cream (~1.1:1).
- **[P1] /track order details are disabled form inputs.** TrackRow (track page 393-412) puts Total/Balance Due in disabled Inputs: ~4.1:1 contrast AA failure, uncopyable, banned "government-portal energy."
- **[P1] Order wizard loses all state on interruption.** No sessionStorage mirror; WhatsApp in-app browser evicts tabs routinely.
- **[P1] Dead-end status pages + priceless confirm.** StatusPage (confirm page 279-296) says "contact us" with no link; `{inquiry.admin_price && …}` hides Total entirely when unset, letting customers confirm an unpriced order.
- **[P2] Step-4 server errors point at hidden fields** (OrderForm.tsx:154-158).
- **[P2] Dietary section styled as an emergency** (danger red box/pills, confirm page 161-188).
- **[P2] Peak-end moments wear WhatsApp green, not ZMade teal** (success page, cancelled track, EditOrderModal; #fff text at 1.99:1).
- **[P2] One Voice Rule violations**: teal price on confirm, 4-5 teal fills on /order stepper, teal stepper fills on /track.
- **[P2] Duplicate stacked footers on /confirm**; Arabic input renders LTR (no dir="auto"); ink-muted 4.43:1 marginal AA at 12-13px.

## Persona Red Flags
**Customer (Kuwaiti, Android, WhatsApp browser):** English-only first paint incl. "Security Deposit via WAMD"; Arabic cake messages display LTR-mangled; 3 Google font families over 4G with visible swap; red dietary box reads as "something's wrong"; empty Request Changes submits successfully.
**Zainab (owner):** /confirm top half is send-proudly; /track's disabled-input ledger and triple "Not set" are not; "Step 1 of 4 — Who are you?" is interrogation copy; duplicate footers; /order data quality well-protected (DB-driven options, structured phone, constrained dates).
**Full-stack engineer:** `as any` at the token boundary (confirm 39, track 56, 69); getMinDate UTC bug (OrderForm 37-41); `phoneRow` binds min_lead_days (order/page.tsx:16); business_settings re-queried 2-4x per view; no next/image; PhoneInput dropdown mouse-only; skeletons mismatch pages; fire-and-forget uploads on /confirm.

## What's Working
1. Confirm-page hero: display-type greeting + teal-wash bespoke-order block + selection pills — the Atelier Ledger moment the spec asked for.
2. Real interaction engineering: roving-tabindex RadioGroup, focus-trapped Modal, useReducedMotion everywhere, ease-out-quart token.
3. Kuwait-native domain modeling: blackout dates, min-lead-days, governorate/block/street, KD 12.500, WAMD.

## Minor Observations
DESIGN.md mislabels cubic-bezier(0.76,0,0.24,1) as ease-out-quart (code's [0.25,1,0.5,1] is correct); title= tooltips unreachable on touch; text-[10px] in upload buttons; /order/success reachable without submission; themed Sonner toasts unused on customer routes; suppressHydrationWarning on html+body.
