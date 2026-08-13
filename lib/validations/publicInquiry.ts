import { z } from 'zod'
import { KUWAIT_PHONE_REGEX } from './inquiry'

// Earliest event date a customer may book, given the admin-configured minimum lead time
// (business_settings.min_lead_days). Same-day is always excluded regardless of the
// setting — a lead time of 0 still means "at least tomorrow", not "today allowed" — so
// the lead days stack on top of that fixed one-day floor. Admin-entered inquiries are
// exempt from this entirely (see the event_date field in ./inquiry.ts).
export function minPublicEventDate(minLeadDays: number): Date {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + 1 + Math.max(minLeadDays, 0))
  return d
}

// Per-item shape for the public /order form. Stricter than the admin inquiryItemSchema
// (cake_size/flavor are required, not just refined-when-order_type-is-cake) since the public
// form only ever creates 'cake' items — there is no public order_type/item_name concept
// (that stays admin-only, for manually entered non-cake orders).
const publicInquiryItemShape = {
  cake_size: z.string().min(1, 'Please choose a size').max(100),
  flavor: z.string().min(1, 'Please choose a flavor').max(150),
  occasion: z.string().max(150).optional().default(''),
  // UI-only convenience field — not a DB column; stripped before insert
  // (see app/api/inquiries/route.ts).
  cake_type: z.enum(['normal', 'theme']),
  theme: z.string().max(200).optional().default(''),
  message_on_cake: z.string().max(255, 'Message must be under 255 characters').optional().default(''),
  special_requirements: z.string().max(1000).optional().default(''),
  // Previously hardcoded to 1 at the API layer (it didn't exist on this schema at all) —
  // now lives per item. Defaults to 1 since the public wizard doesn't yet expose a
  // per-item quantity control; forms work can drop the default once it does.
  quantity: z
    .number({ error: 'Quantity must be a number' })
    .int()
    .min(1, 'Minimum 1 cake')
    .max(50, 'Maximum 50 cakes')
    .optional()
    .default(1),
}

function publicItemRefine(
  data: { cake_type?: 'normal' | 'theme'; theme?: string },
  ctx: z.RefinementCtx
) {
  if (data.cake_type === 'theme' && !data.theme?.trim()) {
    ctx.addIssue({ code: 'custom', message: 'Tell us the theme you have in mind', path: ['theme'] })
  }
}

function clearThemeWhenNormal<T extends { cake_type?: 'normal' | 'theme'; theme?: string }>(
  data: T
): T {
  return data.cake_type === 'normal' ? { ...data, theme: '' } : data
}

export const publicInquiryItemSchema = z
  .object(publicInquiryItemShape)
  .superRefine(publicItemRefine)
  .transform(clearThemeWhenNormal)

// Shared schema for the public /order form. Order-level fields (customer, event date,
// delivery, allergens, reference photos) stay flat here; per-item fields (cake_size, flavor,
// etc. — see publicInquiryItemSchema above) live in `items`, one entry per distinct item in
// the order (see supabase/migrations/034_multi_item_inquiries.sql).
export const publicInquirySchema = z
  .object({
    customer_name: z.string().min(2, 'Please enter your name').max(150).trim(),
    customer_phone: z
      .string()
      .regex(KUWAIT_PHONE_REGEX, 'Enter a valid phone number (e.g. +965 6685 7560)')
      .trim(),
    items: z
      .array(publicInquiryItemSchema)
      .min(1, 'Add at least one item')
      .max(20, 'Maximum 20 items per order'),
    allergen_nut_free: z.boolean().default(false),
    allergen_dairy_free: z.boolean().default(false),
    allergen_egg_free: z.boolean().default(false),
    allergen_raw_sugar: z.boolean().default(false),
    allergen_other: z.string().max(500).optional().default(''),
    event_date: z.string().min(1, 'Please choose your event date'),
    // Empty string (an untouched <input type="time">) isn't valid for the
    // Postgres `time` column — normalize it to null before it reaches the DB.
    pickup_time: z.string().optional().nullable().transform((v) => (v ? v : null)),
    delivery_type: z.enum(['pickup', 'delivery']),
    source: z.literal('public_form'),
    address_governorate: z.string().optional().default('capital'),
    address_area: z.string().optional().default(''),
    address_block: z.string().optional().default(''),
    address_street: z.string().optional().default(''),
    address_house_no: z.string().optional().default(''),
    address_extra_notes: z.string().optional().default(''),
    // Pasted Google Maps share link (Maps app → drop pin → Share → copy link).
    address_location_link: z.string().max(500).optional().default(''),
    // Uploaded ahead of submission via /api/upload/order — not a DB column on
    // inquiries; turned into inquiry_images rows after the inquiry is created
    // (see app/api/inquiries/route.ts).
    reference_images: z
      .array(z.object({ url_original: z.string(), url_medium: z.string(), url_thumb: z.string() }))
      .max(6, 'Up to 6 reference photos')
      .optional()
      .default([]),
  })
  .superRefine((data, ctx) => {
    if (data.delivery_type === 'delivery') {
      if (!data.address_area?.trim()) ctx.addIssue({ code: 'custom', message: 'Area is required for delivery', path: ['address_area'] })
      if (!data.address_block?.trim()) ctx.addIssue({ code: 'custom', message: 'Block is required', path: ['address_block'] })
      if (!data.address_street?.trim()) ctx.addIssue({ code: 'custom', message: 'Street is required', path: ['address_street'] })
      if (!data.address_house_no?.trim()) ctx.addIssue({ code: 'custom', message: 'House number is required', path: ['address_house_no'] })
    }
  })

export type PublicInquiryInput = z.input<typeof publicInquirySchema>
export type PublicInquiryData = z.infer<typeof publicInquirySchema>
