import { z } from 'zod'
import { inquiryItemSchema } from './inquiryItem'

export const KUWAIT_PHONE_REGEX = /^\+?[0-9\s\-]{7,20}$/
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const SHORT_TOKEN_REGEX = /^[A-Za-z0-9]{8,14}$/

// Base shape, kept separate from the exported schemas below so both the full (create) and
// .partial() (update) variants can share the same order-level refinements. The nine
// item-level fields (cake_size, flavor, occasion, cake_type, theme, message_on_cake,
// quantity, special_requirements, order_type, item_name) live on `items` now — see
// lib/validations/inquiryItem.ts (supabase/migrations/034_multi_item_inquiries.sql).
const inquiryShape = {
  customer_name: z.string().min(2, 'Name must be at least 2 characters').max(150).trim(),
  customer_phone: z
    .string()
    .regex(KUWAIT_PHONE_REGEX, 'Enter a valid phone number (e.g. +965 6685 7560)')
    .trim(),
  // One inquiry now has N items — each fully validated by inquiryItemSchema (per-item
  // cake_type/order_type refinements and the theme-clearing transform live there).
  items: z
    .array(inquiryItemSchema)
    .min(1, 'Add at least one item')
    .max(20, 'Maximum 20 items per order'),
  allergen_nut_free: z.boolean().default(false),
  allergen_dairy_free: z.boolean().default(false),
  allergen_egg_free: z.boolean().default(false),
  allergen_raw_sugar: z.boolean().default(false),
  allergen_other: z.string().max(500).optional().default(''),
  // Manual settle override — NOT "is paid". Payment status and balance are derived from
  // the `payments` ledger (see lib/payments.ts); this flag only lets an admin write off a
  // small leftover balance (a comped remainder or a rounding difference), forcing the
  // order to read as settled/paid regardless of the money actually collected.
  fully_paid: z.boolean().default(false),
  // No date-range restriction here — this schema backs the admin-only inquiry actions
  // (see lib/actions/inquiries.ts, gated on an authenticated admin user), and admins need
  // to backdate past orders and edit historical records freely. The minimum-lead-time rule
  // is a customer-facing restriction only — enforced in lib/validations/publicInquiry.ts.
  event_date: z.string().min(1, 'Event date is required'),
  // Empty string (an untouched <input type="time">) isn't valid for the
  // Postgres `time` column — normalize it to null before it reaches the DB.
  pickup_time: z.string().optional().nullable().transform((v) => (v ? v : null)),
  delivery_type: z.enum(['pickup', 'delivery']),
  admin_price: z
    .number({ error: 'Price must be a number' })
    .positive('Price must be greater than 0')
    .max(9999)
    .optional()
    .nullable(),
  discount: z.number().min(0).max(9999).optional().default(0),
  // Set by the admin when delivery_type is 'delivery'; must be 0 on a pickup order —
  // see deliveryChargeRefine below.
  delivery_charge: z.number().min(0).max(9999).optional().default(0),
  customer_id: z.string().uuid().optional().nullable(),
  deposit_amount: z.number().positive().max(9999).optional().nullable(),
  payment_method: z.enum(['', 'cash', 'wamd']).default(''),
  admin_notes: z.string().max(2000).optional().default(''),
  source: z.enum(['admin', 'public_form']).default('admin'),
}

function discountRefine(
  data: { admin_price?: number | null; discount?: number },
  ctx: z.RefinementCtx
) {
  if ((data.discount ?? 0) > (data.admin_price ?? 0)) {
    ctx.addIssue({
      code: 'custom',
      message: 'Discount cannot exceed the price',
      path: ['discount'],
    })
  }
}

function deliveryChargeRefine(
  data: { delivery_type?: 'pickup' | 'delivery'; delivery_charge?: number },
  ctx: z.RefinementCtx
) {
  if (data.delivery_type === 'pickup' && (data.delivery_charge ?? 0) > 0) {
    ctx.addIssue({
      code: 'custom',
      message: 'Delivery charge only applies to delivery orders',
      path: ['delivery_charge'],
    })
  }
}

export const inquirySchema = z
  .object(inquiryShape)
  .superRefine(discountRefine)
  .superRefine(deliveryChargeRefine)

// .partial() makes `items` itself optional — omitting it from an update payload means "don't
// touch items" (see updateInquiry in lib/actions/inquiries.ts). It does NOT relax validation
// of any item that IS provided: .partial() only widens the outer object's own keys, so each
// element of `items`, when present, is still fully validated by inquiryItemSchema.
export const inquiryUpdateSchema = z
  .object(inquiryShape)
  .partial()
  .superRefine(discountRefine)
  .superRefine(deliveryChargeRefine)

export const deliveryAddressSchema = z.object({
  governorate: z.enum(
    ['capital', 'hawalli', 'farwaniyah', 'ahmadi', 'jahra', 'mubarak_al_kabeer'],
    { error: 'Select a governorate' }
  ),
  area: z.string().min(1, 'Area is required').max(100).trim(),
  block: z.string().min(1, 'Block is required').max(20).trim(),
  street: z.string().min(1, 'Street is required').max(100).trim(),
  house_no: z.string().min(1, 'House number is required').max(50).trim(),
  extra_notes: z.string().max(500).optional().default(''),
  // Pasted Google Maps share link (Maps app → drop pin → Share → copy link) —
  // no maps API/key needed, just stored as free text.
  location_link: z.string().max(500).optional().default(''),
})

// Accepts the short tokens generated by lib/tokens.ts going forward, and the
// long-form UUIDs already sent out on links created before that change —
// mirrors isValidToken() in lib/utils.ts.
export const tokenSchema = z
  .string()
  .refine((val) => UUID_REGEX.test(val) || SHORT_TOKEN_REGEX.test(val), {
    message: 'Invalid token format',
  })

export type InquiryFormData = z.infer<typeof inquirySchema>
export type DeliveryAddressData = z.infer<typeof deliveryAddressSchema>
