import { z } from 'zod'

export const publicInquirySchema = z.object({
  customer_name: z.string().min(2).max(150).trim(),
  customer_phone: z.string().min(6).max(30).trim(),
  cake_size: z.string().min(1).max(100),
  flavor: z.string().min(1).max(150),
  occasion: z.string().max(150).optional().default(''),
  theme: z.string().max(200).optional().default(''),
  decoration_style: z.string().min(1).max(100),
  message_on_cake: z.string().max(255).optional().default(''),
  special_requirements: z.string().max(1000).optional().default(''),
  allergen_nut_free: z.boolean().default(false),
  allergen_gluten_free: z.boolean().default(false),
  allergen_dairy_free: z.boolean().default(false),
  allergen_egg_free: z.boolean().default(false),
  allergen_halal: z.boolean().default(false),
  allergen_other: z.string().max(500).optional().default(''),
  event_date: z.string().min(1),
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
    if (data.delivery_type === 'delivery') {
      if (!data.address_area?.trim()) ctx.addIssue({ code: 'custom', message: 'Area is required for delivery', path: ['address_area'] })
      if (!data.address_block?.trim()) ctx.addIssue({ code: 'custom', message: 'Block is required', path: ['address_block'] })
      if (!data.address_street?.trim()) ctx.addIssue({ code: 'custom', message: 'Street is required', path: ['address_street'] })
      if (!data.address_house_no?.trim()) ctx.addIssue({ code: 'custom', message: 'House number is required', path: ['address_house_no'] })
    }
  })

export type PublicInquiryData = z.infer<typeof publicInquirySchema>
