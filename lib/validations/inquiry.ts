import { z } from 'zod'

export const KUWAIT_PHONE_REGEX = /^\+?[0-9\s\-]{7,20}$/
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

// Base shape, kept separate from the exported schemas below so both the full (create) and
// .partial() (update) variants can share the same cake_type <-> theme refinement/transform.
const inquiryShape = {
  customer_name: z.string().min(2, 'Name must be at least 2 characters').max(150).trim(),
  customer_phone: z
    .string()
    .regex(KUWAIT_PHONE_REGEX, 'Enter a valid phone number (e.g. +965 6685 7560)')
    .trim(),
  cake_size: z.string().max(100).optional().default(''),
  flavor: z.string().max(150).optional().default(''),
  occasion: z.string().max(150).optional().default(''),
  // UI-only convenience field — 'theme' selection just means theme !== ''. Not a DB column;
  // must be stripped before any insert/update (see lib/actions/inquiries.ts).
  cake_type: z.enum(['normal', 'theme']),
  theme: z.string().max(200).optional().default(''),
  message_on_cake: z.string().max(255, 'Message must be under 255 characters').optional().default(''),
  quantity: z
    .number({ error: 'Quantity must be a number' })
    .int()
    .min(1, 'Minimum 1 cake')
    .max(50, 'Maximum 50 cakes'),
  // "Cake Details" — consolidated free-text field (decoration dropdown folded into this).
  special_requirements: z.string().max(1000).optional().default(''),
  allergen_nut_free: z.boolean().default(false),
  allergen_dairy_free: z.boolean().default(false),
  allergen_egg_free: z.boolean().default(false),
  allergen_raw_sugar: z.boolean().default(false),
  allergen_other: z.string().max(500).optional().default(''),
  fully_paid: z.boolean().default(false),
  // amount_paid is the only figure credited against the price (see lib/payments.ts).
  // deposit_amount, below, is separate collateral and never subtracted from the balance.
  amount_paid: z.number().positive().max(9999).optional().nullable(),
  // UI-only convenience field — the 3-way Payment Status control (Unpaid/Partial/Paid).
  // Not a DB column (the real, generated `payment_status` column lives in
  // lib/supabase/types.ts and is never settable); must be stripped before any
  // insert/update (see lib/actions/inquiries.ts). Named distinctly from that column
  // to avoid ever being confused with it.
  payment_choice: z.enum(['unpaid', 'partial', 'paid']).default('unpaid'),
  event_date: z
    .string()
    .refine((d) => {
      const date = new Date(d)
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      tomorrow.setHours(0, 0, 0, 0)
      return date >= tomorrow
    }, 'Event date must be at least tomorrow'),
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
  order_type: z.enum(['cake', 'other_item']).default('cake'),
  item_name: z.string().max(150).optional().default(''),
  customer_id: z.string().uuid().optional().nullable(),
  deposit_amount: z.number().positive().max(9999).optional().nullable(),
  payment_method: z.enum(['', 'cash', 'wamd']).default(''),
  admin_notes: z.string().max(2000).optional().default(''),
  source: z.enum(['admin', 'public_form']).default('admin'),
}

function cakeTypeRefine(
  data: { cake_type?: 'normal' | 'theme'; theme?: string },
  ctx: z.RefinementCtx
) {
  if (data.cake_type === 'theme' && !data.theme?.trim()) {
    ctx.addIssue({
      code: 'custom',
      message: 'Theme is required for a theme cake',
      path: ['theme'],
    })
  }
}

function clearThemeWhenNormal<T extends { cake_type?: 'normal' | 'theme'; theme?: string }>(
  data: T
): T {
  return data.cake_type === 'normal' ? { ...data, theme: '' } : data
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

function paymentChoiceRefine(
  data: { payment_choice?: 'unpaid' | 'partial' | 'paid'; amount_paid?: number | null },
  ctx: z.RefinementCtx
) {
  if (data.payment_choice === 'partial' && !(data.amount_paid && data.amount_paid > 0)) {
    ctx.addIssue({
      code: 'custom',
      message: 'Enter the amount paid so far',
      path: ['amount_paid'],
    })
  }
}

function orderTypeRefine(
  data: { order_type?: 'cake' | 'other_item'; cake_size?: string; flavor?: string; item_name?: string },
  ctx: z.RefinementCtx
) {
  if (data.order_type === 'cake') {
    if (!data.cake_size?.trim()) {
      ctx.addIssue({
        code: 'custom',
        message: 'Select a size',
        path: ['cake_size'],
      })
    }
    if (!data.flavor?.trim()) {
      ctx.addIssue({
        code: 'custom',
        message: 'Select a flavor',
        path: ['flavor'],
      })
    }
  } else if (data.order_type === 'other_item') {
    if (!data.item_name?.trim()) {
      ctx.addIssue({
        code: 'custom',
        message: 'Item name is required',
        path: ['item_name'],
      })
    }
  }
}

export const inquirySchema = z
  .object(inquiryShape)
  .superRefine(cakeTypeRefine)
  .superRefine(discountRefine)
  .superRefine(deliveryChargeRefine)
  .superRefine(orderTypeRefine)
  .superRefine(paymentChoiceRefine)
  .transform(clearThemeWhenNormal)

export const inquiryUpdateSchema = z
  .object(inquiryShape)
  .partial()
  .superRefine(cakeTypeRefine)
  .superRefine(discountRefine)
  .superRefine(deliveryChargeRefine)
  .superRefine(orderTypeRefine)
  .superRefine(paymentChoiceRefine)
  .transform(clearThemeWhenNormal)

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

export const tokenSchema = z
  .string()
  .regex(UUID_REGEX, 'Invalid token format')

export type InquiryFormData = z.infer<typeof inquirySchema>
export type DeliveryAddressData = z.infer<typeof deliveryAddressSchema>
