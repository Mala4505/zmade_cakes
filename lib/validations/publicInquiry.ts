import { z } from 'zod'
import { KUWAIT_PHONE_REGEX } from './inquiry'

// Shared schema for the public /order form. Mirrors the admin inquiry schema's
// cake_type <-> theme rule: 'theme' selection requires a theme description, and
// switching back to 'normal' clears it on parse.
export const publicInquirySchema = z
  .object({
    customer_name: z.string().min(2, 'Please enter your name').max(150).trim(),
    customer_phone: z
      .string()
      .regex(KUWAIT_PHONE_REGEX, 'Enter a valid phone number (e.g. +965 6685 7560)')
      .trim(),
    cake_size: z.string().min(1, 'Please choose a size').max(100),
    flavor: z.string().min(1, 'Please choose a flavor').max(150),
    occasion: z.string().max(150).optional().default(''),
    // UI-only convenience field — not a DB column; stripped before insert
    // (see app/api/inquiries/route.ts).
    cake_type: z.enum(['normal', 'theme']),
    theme: z.string().max(200).optional().default(''),
    message_on_cake: z.string().max(255, 'Message must be under 255 characters').optional().default(''),
    special_requirements: z.string().max(1000).optional().default(''),
    allergen_nut_free: z.boolean().default(false),
    allergen_dairy_free: z.boolean().default(false),
    allergen_egg_free: z.boolean().default(false),
    allergen_raw_sugar: z.boolean().default(false),
    allergen_other: z.string().max(500).optional().default(''),
    event_date: z.string().min(1, 'Please choose your event date'),
    pickup_time: z.string().optional().nullable(),
    delivery_type: z.enum(['pickup', 'delivery']),
    source: z.literal('public_form'),
    address_governorate: z.string().optional().default('capital'),
    address_area: z.string().optional().default(''),
    address_block: z.string().optional().default(''),
    address_street: z.string().optional().default(''),
    address_house_no: z.string().optional().default(''),
    address_extra_notes: z.string().optional().default(''),
  })
  .superRefine((data, ctx) => {
    if (data.cake_type === 'theme' && !data.theme?.trim()) {
      ctx.addIssue({ code: 'custom', message: 'Tell us the theme you have in mind', path: ['theme'] })
    }
    if (data.delivery_type === 'delivery') {
      if (!data.address_area?.trim()) ctx.addIssue({ code: 'custom', message: 'Area is required for delivery', path: ['address_area'] })
      if (!data.address_block?.trim()) ctx.addIssue({ code: 'custom', message: 'Block is required', path: ['address_block'] })
      if (!data.address_street?.trim()) ctx.addIssue({ code: 'custom', message: 'Street is required', path: ['address_street'] })
      if (!data.address_house_no?.trim()) ctx.addIssue({ code: 'custom', message: 'House number is required', path: ['address_house_no'] })
    }
  })
  .transform((data) => (data.cake_type === 'normal' ? { ...data, theme: '' } : data))

export type PublicInquiryInput = z.input<typeof publicInquirySchema>
export type PublicInquiryData = z.infer<typeof publicInquirySchema>
