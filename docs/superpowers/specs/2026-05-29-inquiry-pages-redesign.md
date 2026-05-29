# Inquiry Pages Redesign — Design Spec
**Date:** 2026-05-29  
**Status:** Approved for implementation  
**Register:** Product (admin tool)  
**Icon library:** Phosphor (`@phosphor-icons/react`) — project-wide standard

---

## Context

The admin inquiry pages had three problems: (1) the list page showed too little data and had no way to change status or payment without opening the detail page, (2) the detail page displayed order info as static read-only text when it should be editable inline, and (3) layout/spacing felt cramped and inconsistent. This spec covers a full redesign of both pages plus the InquiryActions component.

---

## Scope

| File | Change |
|---|---|
| `app/admin/inquiries/page.tsx` | Full redesign — table layout, filter row, inline status+payment change |
| `app/admin/inquiries/[id]/page.tsx` | Full redesign — timeline, top actions, grouped editable form |
| `app/admin/inquiries/[id]/_components/InquiryActions.tsx` | Replace "Mark as Sent" with status-driven next-step + top placement |
| `app/admin/inquiries/_components/InquiryStatusTabs.tsx` | Remove — replaced by filter dropdowns in table page |
| `app/admin/inquiries/_components/InquiryForm.tsx` | Merge into detail page (no separate edit section) — 6 cards → 3 grouped cards |
| `components/admin/` | New: `InquiryStatusSelect.tsx`, `InquiryPaymentSelect.tsx` (inline change + checkmark) |

---

## Page 1 — Inquiries List

### Layout
- Container: `px-4 py-6 md:px-8 md:py-8 max-w-5xl mx-auto` (unchanged)
- Page header: "Inquiries" + New button (unchanged)
- Filter row replaces status tabs
- Table replaces card list

### Filter Row
Four controls in a single `flex gap-3` row:
1. **Search input** — `flex-1`, placeholder "Search by name or phone…"
2. **Status dropdown** — `<select>` with all 8 statuses + "All statuses" default; values match `InquiryStatus` enum (`pending`, `awaiting_confirmation`, `confirmed`, `in_progress`, `ready`, `delivered`, `cancelled`)
3. **Payment dropdown** — `<select>` with values `unpaid`, `partial`, `paid` + "All payments" default
4. **Sort dropdown** — Event date ↑ (default) / Created ↓ / Price ↓

All controls use the existing `var(--color-surface)` background + `var(--color-border)` border, `rounded-lg`, `text-sm`.

### Table Columns
| Column | Width | Content |
|---|---|---|
| Priority | 20px | Colored dot: `var(--color-danger)` = urgent, `#f59e0b` = medium, `var(--color-border)` = none |
| Customer | auto | Name (bold) + Occasion/flavor subtitle row. "↩ Returning" badge if this `customer_id` has more than 1 inquiry total (excluding the current one). |
| Event Date | 100px | `formatDate()` + "Today"/"Tomorrow" urgent badge in `var(--color-danger)` tint if within 48h |
| Price | 80px | `formatKWD()` bold mono. "⚠ No price" in danger color if `admin_price` is null |
| Balance | 90px | Outstanding balance mono or "Settled" in success color |
| Status | 130px | `InquiryStatusSelect` — badge click opens dropdown + ✓ confirm |
| Payment | 120px | `InquiryPaymentSelect` — badge click opens dropdown + ✓ confirm |

**No price row**: apply `outline: 1.5px solid var(--color-danger); outline-offset: -1px` on the `<tr>`. (`var(--color-danger)` = `#c13434` red — not orange.)

### Inline Status/Payment Change Component
Two shared components (`InquiryStatusSelect`, `InquiryPaymentSelect`):
- Default state: renders the colored badge
- Click → badge replaced by `<select>` + `<button>` (Phosphor `<Check />`) in a `flex gap-1.5` wrapper
- ✓ button click → calls server action → reverts to badge showing new value
- Cancel via `Escape` or clicking away reverts without saving
- Row background transitions to `var(--color-teal-light)` while edit is in-flight
- Interaction states: hover on badge shows subtle `cursor-pointer` underline; ✓ button gets `scale(0.97)` on `:active`

### Payment Status Field
New field — stored as `payment_status` enum: `unpaid | partial | paid`.
Badge colors:
- `paid` → `#d1fae5` bg / `#065f46` text
- `partial` → `#fff3cd` bg / `var(--color-warning)` text  
- `unpaid` → `#fee2e2` bg / `var(--color-danger)` text

---

## Page 2 — Inquiry Detail

### Layout Order (top to bottom)
1. Back link `← Inquiries`
2. Sticky header card
3. **Next Step banner** (actions at top)
4. **WhatsApp quick messages** (actions at top)
5. Order timeline
6. Grouped editable form cards
7. Reference Images (collapsible)
8. Customer Profile card (conditional)
9. Cancel button

### Sticky Header Card
`background: var(--color-surface-raised)`, `border`, `rounded-xl`, `p-4`, `mb-4`

Left side: Customer name (large, bold) + VIP badge (`#fef3c7`/`#92400e`) if `customerData?.vip`. Subtitle: size · flavor · `formatKWD(admin_price)`.  
Right side: `<StatusBadge />` + returning chip if `pastOrderCount > 0`.

### Next Step Banner
`background: var(--color-teal-light)`, `border: 1px solid #b2dbd9`, `rounded-xl`, `p-3 px-4`, `flex items-center justify-between`, `mb-3`

Label: "NEXT STEP" in `text-xs font-bold uppercase tracking-wider text-[var(--color-teal-deep)]`  
Button: teal filled, shows the correct action based on `inquiry.status`:

| Current status | Button label | Icon |
|---|---|---|
| `pending` | Mark as Awaiting | `<Clock />` |
| `awaiting_confirmation` | Mark as Confirmed | `<CheckCircle />` |
| `confirmed` | Mark as Making | `<ForkKnife />` |
| `in_progress` | Mark as Ready | `<Package />` |
| `ready` | Mark as Delivered | `<Truck />` |
| `delivered` | (hidden — show completion state) | — |
| `cancelled` | (hidden) | — |

On click → calls `updateInquiryStatus` server action → `router.refresh()`.

### WhatsApp Quick Messages
`rounded-xl border p-4 mb-4 flex flex-col gap-2.5`

Section label: "Quick Message" (uppercase muted, same style)

Buttons shown conditionally:
- **Not confirmed + has price**: `<WhatsappLogo />` "Send Confirmation" (teal bg) + `<Link />` "Copy Link" (ghost)
- **Confirmed + `in_progress`/`ready`**: `<WhatsappLogo />` "Order Ready" (green `#25D366`)
- **Has outstanding balance**: `<WhatsappLogo />` "Balance Due — KD X.XXX" (darker green)
- **Always**: `<WhatsappLogo />` "Message Customer" (ghost border)

No "Mark as Sent" button.

### Order Timeline
`flex items-start mb-4`

6 steps: Pending → Awaiting → Confirmed → Making → Ready → Delivered  
Each step: dot + label + connecting line  
- Past steps: filled teal dot + teal line
- Current step: white dot with `3px solid var(--color-teal)` border + `box-shadow: 0 0 0 3px var(--color-teal-light)` + bold teal label
- Future steps: muted dot + muted line

### Grouped Editable Form Cards
Remove the separate "Edit Inquiry" section label at the bottom. All fields are always editable. 6 original sections merged to 3 cards:

**Card 1 — Customer & Contact** (`divide-y divide-[var(--color-border)]`)
- Name field (full width)
- Phone field: `flex` row — input `flex-1 min-w-0` (truncates properly) + `<Copy />` icon button + `<WhatsappLogo />` icon button (green tint bg)

**Card 2 — Cake & Event** (2-col grid, `divide-y` separating cake from event section)
- Size, Flavor (row 1)
- Occasion, Theme (row 2)
- Decorations, Message on Cake (row 3)
- `border-t` divider
- Event Date (with "X days left" countdown chip — red ≤1 day, orange ≤3 days, muted otherwise), Pickup Time (row 1)
- Delivery Type select (row 2)
- Address block (conditional, `col-span-2`, shows when delivery_type = 'delivery')

**Card 3 — Pricing & Admin** (`divide-y`)
- Admin Price (KD), Advance Paid (KD) (row 1 — 2-col)
- Balance bar: visual fill `advance/price * 100%`, teal fill, shows "Settled" or "KD X.XXX remaining"
- Payment Method (full width)
- `border-t` divider
- Priority select, Source select (row 1 — 2-col)
- Admin Notes textarea (full width)

### Reference Images (collapsible)
`rounded-xl border p-4`  
Header: "Reference Images" label + `<CaretUp />` / `<CaretDown />` toggle  
Default: expanded. Toggle collapses/expands with CSS transition (height auto → 0, no JS animation for simplicity).  
Image grid: `flex gap-2 flex-wrap`. Each thumb `48px × 48px`, `rounded-lg`. Add button: dashed border, `<Plus />` icon.

### Customer Profile Card
`rounded-xl border p-4 bg-[var(--color-teal-light)] border-[var(--color-teal-light)]`  
Name + VIP badge + notes (unchanged from current, just repositioned above cancel).

### Cancel Button
`w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm border border-[var(--color-danger-light)] text-[var(--color-danger)] mt-4`  
`<X />` icon (Phosphor).

---

## Interaction States (all interactive elements)

| Element | State | Behavior |
|---|---|---|
| All buttons | `:active` | `transform: scale(0.97)`, `transition: transform 100ms ease-out` |
| Status/payment badge | hover | `cursor-pointer`, subtle underline or brightness dim |
| ✓ confirm button | hover | teal bg brightens slightly |
| ✓ confirm button | loading | Phosphor `<Spinner />` spin replaces `<Check />` |
| Dropdown open | enter | `scale(0.95) opacity-0` → `scale(1) opacity-1`, 150ms `ease-out`, origin from badge |
| Dropdown close | exit | 100ms `ease-in`, faster than open |
| Form field | focus | `border-color: var(--color-teal)`, `ring-2 ring-[var(--color-teal-light)]` |
| Next Step button | loading | `disabled opacity-60` + `<Spinner />` |
| Row status edit | in-flight | row bg `var(--color-teal-light)` transition 150ms |

---

## Save Behavior (Form)

- **Status change (list + detail)**: immediate on ✓ confirm click → `router.refresh()`
- **Next Step button**: immediate → `router.refresh()`
- **Form fields**: save on explicit "Save Changes" button at bottom of form (existing pattern, keep it)
- **Feedback**: Sonner toast — `toast.success("Saved")` on status change, `toast.error(msg)` on failure

---

## Database — New Fields Required

| Table | Column | Type | Default |
|---|---|---|---|
| `inquiries` | `payment_status` | `enum('unpaid','partial','paid')` | `'unpaid'` |

Migration: `010_payment_status.sql`

---

## Icon Reference (Phosphor — all `weight="regular"` unless noted)

| Usage | Icon | Weight |
|---|---|---|
| Copy link | `<Copy />` | regular |
| WhatsApp | `<WhatsappLogo />` | fill |
| Check / confirm | `<Check />` | bold |
| Next step confirm | `<CheckCircle />` | fill |
| Cancel / close | `<X />` | regular |
| New button | `<Plus />` | bold |
| Package / ready | `<Package />` | regular |
| Truck / deliver | `<Truck />` | regular |
| Clock / awaiting | `<Clock />` | regular |
| Collapse toggle | `<CaretUp />` / `<CaretDown />` | regular |
| Add image | `<Plus />` | regular |
| Loading spinner | `<Spinner />` | regular |
| Link | `<Link />` | regular |

---

## What Is Removed

- `InquiryStatusTabs.tsx` — deleted, replaced by filter dropdowns
- Separate "Edit Inquiry" section at bottom of detail page — merged into main form
- "Mark as Sent" button in InquiryActions — replaced by Next Step banner
- Confirmation link URL displayed as raw mono text — moved to copy button only
- Summary card (read-only grid of detail fields) — replaced by always-editable form cards

---

## Verification

1. List page: navigate to `/admin/inquiries` — table renders, filter dropdowns work, click a status badge → dropdown + ✓ appears → confirm → toast fires → badge updates
2. List page: row with no `admin_price` shows orange outline + "⚠ No price"
3. List page: event within 48h shows "Today"/"Tomorrow" badge
4. Detail page: navigate to `/admin/inquiries/[id]` — actions at top, timeline visible, all fields are inputs
5. Detail page: phone field does not overflow container
6. Detail page: Next Step button label matches current status
7. Detail page: WA buttons appear/hide based on status and payment state
8. Detail page: clicking `<CaretDown />` collapses reference images
9. Detail page: balance bar fills proportionally to advance/price ratio
10. New `payment_status` migration applied without error
