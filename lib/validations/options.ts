import { z } from 'zod'

// theme_options / decoration_style_options dropped: cake type is now a fixed
// Normal/Theme radio with free-text theme, and decoration folded into the
// consolidated Cake Details field. Flavors + sizes stay — still used by Products.
export const OPTION_TABLES = [
  'flavor_options',
  'size_options',
  'occasion_options',
  'item_options',
] as const

export type OptionTable = (typeof OPTION_TABLES)[number]

export const optionSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100).trim(),
  sort_order: z.number().int().min(0).default(0),
  is_active: z.boolean().default(true),
})

export type OptionFormData = z.infer<typeof optionSchema>
