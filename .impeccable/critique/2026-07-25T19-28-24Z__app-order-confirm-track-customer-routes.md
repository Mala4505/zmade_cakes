---
target: customer routes /order /confirm /track
total_score: 31
p0_count: 0
p1_count: 2
timestamp: 2026-07-25T19-28-24Z
slug: app-order-confirm-track-customer-routes
---
# Critique — ZMade Cakes customer surface (/order, /confirm/[token], /track/[token])

Re-critique after Phase 1 — Trust & Resilience.

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Unchanged — skeletons/spinners solid, but loading shells still mismatch real layouts (Phase 5 item, untouched) |
| 2 | Match System / Real World | 4 (+1) | Kuwait-native addressing/KD/WhatsApp language throughout; "via WAMD" now explained is still pending (Phase 3) but no longer masking a price entirely |
| 3 | User Control and Freedom | 3 (+1) | Autosave/restore, branded status pages with a WhatsApp exit, unpriced-order guard all landed. Core spec changes still require a WhatsApp detour with no in-page edit path outside Confirm |
| 4 | Consistency and Standards | 3 (+1) | Branded 404 + status pages close the biggest inconsistency; `/track`'s disabled-input ledger vs `/confirm`'s text rows for the same kind of data is still unresolved (Phase 5) |
| 5 | Error Prevention | 3 | Unchanged score, but substance improved: unpriced-confirm guard and empty-request-changes guard now prevent two dead-end submissions that existed at baseline |
| 6 | Recognition Rather Than Recall | 4 (+1) | Review/summary steps remain thorough; dir="auto" on the customer-facing free-text fields removes one recognition failure (mangled Arabic) |
| 7 | Flexibility and Efficiency | 3 (+1) | sessionStorage draft is now a real efficiency affordance surviving WhatsApp tab eviction; single-file photo upload and English-only UI are still open (Phase 2/6) |
| 8 | Aesthetic and Minimalist Design | 3 (+1) | Confirm/Track now handle their edge states without going bare-HTML; but every section on Confirm/Track is still the same rounded-2xl-border-uppercase-eyebrow card repeated in sequence — an identical-card pattern the brand doc bans, just not yet addressed |
| 9 | Error Recovery | 3 (+1) | Server field errors now jump the wizard back to the right step and attempt focus — the baseline's worst recovery gap is fixed |
| 10 | Help and Documentation | 2 (-1) | Still only "Message us" as an escape hatch; the new price-pending panel on Confirm is the one branch that reads as unfinished rather than reassuring |
| **Total** | | **31/40** | **Good — Phase 1 closed the trust/resilience gaps it targeted; the remaining ceiling is device/a11y, copy, and brand-color discipline (Phases 2-5)** |

## Anti-Patterns Verdict

**LLM assessment**: Not AI slop. No gradient text, glass, purple, hero metrics, or identical card *grids*. Two recurring AI-tells remain though: `TrackRow` (`app/track/[token]/page.tsx:393-415`) renders read-only order data as `disabled/readonly <input>` elements instead of typography — the exact "flat corporate form" pattern the brand doc bans — and the three error boundaries share one pasted icon-in-circle-wash + centered-copy template rather than considered layout.

**Deterministic scan**: `npx impeccable detect --json app/order app/confirm app/track` → **0 findings**, exit 0. Matches baseline (also 0). The detector doesn't catch semantic issues like the disabled-input ledger or One Voice violations — those are LLM-review-only findings, as at baseline.

## Overall Impression

Phase 1 did exactly what it was scoped to do: the trust and resilience gaps are closed. A killed WhatsApp tab no longer loses the order, a customer can no longer confirm an unpriced order or submit an empty change request, dead-end status pages now have a way out, and server errors no longer strand the user on step 4 with no context. Score moved 25 → 31 (+6), driven almost entirely by heuristics 3, 4, 6, 7, 8, 9 — precisely the ones Phase 1 targeted.

The next ceiling is different in kind: it's brand-color discipline (teal is now used in 4-5 places per screen, undercutting the design system's own "One Voice" rule), a still-unstyled `/track` ledger that reads as a government form, and a documentation/implementation mismatch (DESIGN.md names Cabinet Grotesk as the display face; the code only ever loads Bricolage Grotesque, its own documented fallback). None of this is new damage — it's what Phases 2-5 already exist to fix, plus one finding (the font gap) that isn't yet in any phase.

## What's Working

1. **Draft-restore + server-error step jump** (`OrderForm.tsx:141-164, 199-208`) solves the exact WhatsApp-in-app-browser eviction problem it was built for — silent restore, no lost work, no user-facing ceremony.
2. **Confirm page's read-only-by-default preferences** (`ConfirmForm.tsx:231-252`) — plain rows until "Edit" is tapped — avoids the "is this saved?" ambiguity most inline-edit forms have.
3. **Progressive disclosure throughout**: theme field, delivery address block, and allergen "other" note only appear when relevant — the strongest anti-cognitive-load choice in the flow, unchanged and still working well.

## Priority Issues

- **[P1] `/track` renders every order detail as a disabled form input.** `TrackRow` (`app/track/[token]/page.tsx:393-415`) wraps Total, Balance Due, Theme, Message, etc. in `<Field><Input disabled readOnly .../></Field>`. This is the literal "flat corporate form" anti-reference from PRODUCT.md, fails AA contrast on money rows (carried from baseline), and invites first-time customers to tap fields that do nothing. *(Carried from baseline; already scoped as Phase 5's `/track` ledger item — no scope change needed, just execute it.)*

- **[P1] One Voice Rule is broken on the pages it matters most.** On `/confirm` and `/track`, teal now appears simultaneously as: the `Navbar` wordmark (`components/public/Navbar.tsx:17`, permanent on every branded page including the new not-found/status pages just added), the "Review" step label, teal-wash selection pills, the stepper's current-step fill, and the primary Confirm button. DESIGN.md's own rule — "teal appears as a filled color on at most one element per screen... its rarity is its authority" — is undercut before the CTA is even reached. *(Consolidates several baseline P2 items; already scoped in Phase 4, but Phase 4's checklist doesn't currently mention the wordmark itself — worth adding.)*

- **[P2] Cabinet Grotesk was never shipped — DESIGN.md documents a font that isn't running.** `app/layout.tsx:2,21-26` and `globals.css:36` load only `Bricolage_Grotesque` and map it directly to `--font-display`. DESIGN.md names Cabinet Grotesk (via Fontshare `next/font/local`) as the primary customer-facing display face and Bricolage as its fallback — the fallback is the only thing in production. Either license and load Cabinet Grotesk, or update DESIGN.md to name Bricolage as the actual choice; right now the spec and the code disagree. *(New finding — not currently in any phase.)*

- **[P2] `dir="auto"` coverage has a gap on the field most likely to need it.** Phase 1 added `dir="auto"` to theme/message/special-requirements/notes per its own scope, but `customer_name` (`OrderForm.tsx:276`) and `allergen_other` (`OrderForm.tsx:390`) were out of that scope and still default to LTR — and a Kuwaiti customer's name in Arabic script is at least as likely as a themed message to need it. *(Small follow-up, not a regression — the original phase item didn't list these two fields.)*

- **[P3] Confirm/Track are a stack of identical cards.** Order summary, allergens, photo upload, preferences, message, and deposit each use the same rounded-2xl-border-with-uppercase-eyebrow shell in sequence — the vertical equivalent of the "identical card grid" the brand doc bans, now on the customer's one brand moment. *(Overlaps Phase 5's polish pass; worth calling out explicitly there.)*

## Persona Red Flags

**Kuwaiti customer, Android, WhatsApp in-app browser**: if the confirmation link is reopened in a *new* WhatsApp webview tab rather than the one that was evicted, the sessionStorage draft (`OrderForm.tsx:141-153`) silently doesn't apply — no "we found a saved draft" banner, just a blank form with no explanation. The "Google Maps: tap Share, paste the link" instruction (`OrderForm.tsx:463-467`, `ConfirmForm.tsx:430-434`) also assumes a native share sheet that's frequently broken inside embedded webviews — unaddressed at baseline and still open.

**First-time customer, no digital-order experience**: on `/track`, the "Edit" pencil sits directly above a block of fields that look editable (`TrackRow`'s disabled inputs) — they'll try to tap and edit, get nothing, and conclude the page is broken. The new price-pending panel on Confirm (`page.tsx:219-238`, added this phase specifically to prevent confirming an unpriced order) is one bare sentence in a plain bordered box with no photo, no progress strip — it successfully blocks the bad action, but reads as an unfinished page rather than "we're working on your quote."

**Zainab (owner), reviewing before she sends a link**: she'd notice the `AllergenPill`'s solid-red all-caps treatment (`page.tsx:306-314`) sits at the same visual intensity as an error state — appropriately alarming for a safety note, but clashing with "quiet confidence" elsewhere on the page (already scoped in Phase 4). She'd also clock that the price-pending fallback, while now safe to send, is the one branch on `/confirm` that still looks like it's missing something rather than intentionally minimal.

## Minor Observations

- `AllergenPill` hardcodes `color: '#fff'` instead of a cream/ink token (baseline finding, unresolved — already in Phase 4's dietary-section item).
- WhatsApp green `#25D366` still hardcoded in three separate files instead of a shared constant (Phase 4 scope).
- `PhoneInput.tsx` focus ring uses solid 2px teal rather than the spec'd teal-light glow used elsewhere.
- `ReferencePhotoUpload.tsx:65` remove-button overlay uses `rgba(0,0,0,0.6)` — near-pure-black in a system that otherwise bans it.
- Confirm/Track's "Message us →" plus Navbar's persistent "My Orders" link add low-stakes navigational noise to otherwise single-purpose brand pages.
