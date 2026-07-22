import { z } from 'zod'

export const blackoutDateSchema = z.object({
  date_from: z.string().min(1, 'Start date is required'),
  date_to: z.string().min(1, 'End date is required'),
  reason: z.string().max(500).optional().default(''),
}).refine(
  (d) => new Date(d.date_from) <= new Date(d.date_to),
  { message: 'End date must be on or after start date', path: ['date_to'] }
)

export const businessInfoSchema = z.object({
  business_phone: z.string().min(1, 'Phone is required').max(30).trim(),
  business_instagram: z.string().max(100).trim().optional().default(''),
})

export const operatingRulesSchema = z.object({
  min_lead_days: z.number().int().min(0).max(90),
})

export const pricingSchema = z.object({
  pricing_matrix: z.record(z.string(), z.number().min(0).max(9999)),
  min_price_guard: z.number().min(0).max(9999),
  rush_multiplier: z.number().min(1).max(5),
})

export const whatsappTemplatesSchema = z.object({
  confirmationLink: z.string().min(1).max(1000),
  orderReady: z.string().min(1).max(1000),
  balanceDue: z.string().min(1).max(1000),
  trackingLink: z.string().min(1).max(1000),
  myOrdersLink: z.string().min(1).max(1000),
})

export type BlackoutDateData = z.infer<typeof blackoutDateSchema>
export type BusinessInfoData = z.infer<typeof businessInfoSchema>
export type OperatingRulesData = z.infer<typeof operatingRulesSchema>
export type PricingData = z.infer<typeof pricingSchema>
export type WhatsAppTemplatesData = z.infer<typeof whatsappTemplatesSchema>
