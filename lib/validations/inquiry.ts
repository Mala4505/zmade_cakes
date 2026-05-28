import { z } from 'zod'

const KUWAIT_PHONE_REGEX = /^\+?[0-9\s\-]{7,20}$/
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export const inquirySchema = z.object({
  customer_name: z.string().min(2, 'Name must be at least 2 characters').max(150).trim(),
  customer_phone: z
    .string()
    .regex(KUWAIT_PHONE_REGEX, 'Enter a valid phone number (e.g. +965 6685 7560)')
    .trim(),
  cake_size: z.string().min(1, 'Select a size').max(100),
  flavor: z.string().min(1, 'Select a flavor').max(150),
  occasion: z.string().max(150).optional().default(''),
  theme: z.string().max(200).optional().default(''),
  decoration_style: z.string().min(1, 'Select a decoration style').max(100),
  message_on_cake: z.string().max(255, 'Message must be under 255 characters').optional().default(''),
  quantity: z
    .number({ invalid_type_error: 'Quantity must be a number' })
    .int()
    .min(1, 'Minimum 1 cake')
    .max(50, 'Maximum 50 cakes'),
  special_requirements: z.string().max(1000).optional().default(''),
  allergen_nut_free: z.boolean().default(false),
  allergen_gluten_free: z.boolean().default(false),
  allergen_dairy_free: z.boolean().default(false),
  allergen_egg_free: z.boolean().default(false),
  allergen_halal: z.boolean().default(false),
  allergen_other: z.string().max(500).optional().default(''),
  balance_paid: z.boolean().default(false),
  balance_paid_at: z.string().optional().nullable(),
  event_date: z
    .string()
    .refine((d) => {
      const date = new Date(d)
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      tomorrow.setHours(0, 0, 0, 0)
      return date >= tomorrow
    }, 'Event date must be at least tomorrow'),
  pickup_time: z.string().optional().nullable(),
  delivery_type: z.enum(['pickup', 'delivery']),
  admin_price: z
    .number({ invalid_type_error: 'Price must be a number' })
    .positive('Price must be greater than 0')
    .max(9999)
    .optional()
    .nullable(),
  advance_amount: z.number().positive().max(9999).optional().nullable(),
  advance_paid: z.boolean().default(false),
  payment_method: z.enum(['', 'cash', 'wamd']).default(''),
  admin_notes: z.string().max(2000).optional().default(''),
  priority: z.union([z.literal(0), z.literal(1), z.literal(2)]).default(0),
  source: z.enum(['admin', 'public_form']).default('admin'),
})

export const inquiryUpdateSchema = inquirySchema.partial()

export const deliveryAddressSchema = z.object({
  governorate: z.enum([
    'capital',
    'hawalli',
    'farwaniyah',
    'ahmadi',
    'jahra',
    'mubarak_al_kabeer',
  ]),
  area: z.string().min(1, 'Area is required').max(100).trim(),
  block: z.string().min(1, 'Block is required').max(20).trim(),
  street: z.string().min(1, 'Street is required').max(100).trim(),
  house_no: z.string().min(1, 'House number is required').max(50).trim(),
  extra_notes: z.string().max(500).optional().default(''),
})

export const tokenSchema = z
  .string()
  .regex(UUID_REGEX, 'Invalid token format')

export type InquiryFormData = z.infer<typeof inquirySchema>
export type DeliveryAddressData = z.infer<typeof deliveryAddressSchema>
